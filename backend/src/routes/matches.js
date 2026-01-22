import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { suggestMatch } from "../services/queue.js";

const router = express.Router();

const suggestSchema = z.object({
  matchType: z.enum(["singles", "doubles"]).default("doubles")
});

const startSchema = z.object({
  courtSessionId: z.string().uuid(),
  matchType: z.enum(["singles", "doubles"]),
  teams: z.array(z.array(z.string().uuid())).length(2),
  entryIds: z.array(z.string().uuid()).optional()
});

const endSchema = z.object({
  matchId: z.string().uuid(),
  score: z.any().optional(),
  winnerTeam: z.number().int().min(1).max(2).optional()
});

const cancelSchema = z.object({
  matchId: z.string().uuid()
});

router.get("/:id", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: { participants: { include: { player: true } } }
  });
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }
  res.json(match);
});

router.post("/:sessionId/suggest", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const parse = suggestSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const { matchType } = parse.data;
  const suggestion = await suggestMatch(req.params.sessionId, matchType);
  if (!suggestion) {
    return res.status(404).json({ error: "Not enough eligible players" });
  }
  res.json(suggestion);
});

router.post("/:sessionId/start", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = startSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const { courtSessionId, matchType, teams, entryIds } = parse.data;

  const match = await prisma.match.create({
    data: {
      sessionId,
      courtSessionId,
      status: "active",
      matchType,
      startedAt: new Date()
    }
  });

  const participants = teams.flatMap((team, idx) =>
    team.map((playerId) => ({ matchId: match.id, playerId, teamNumber: idx + 1 }))
  );

  await prisma.matchParticipant.createMany({ data: participants });

  await prisma.courtSession.update({
    where: { id: courtSessionId },
    data: { status: "in_match", currentMatchId: match.id }
  });

  if (entryIds?.length) {
    await prisma.queueEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: "assigned" }
    });
  } else {
    await prisma.queueEntry.updateMany({
      where: {
        sessionId,
        status: "queued",
        players: { some: { playerId: { in: teams.flat() } } }
      },
      data: { status: "assigned" }
    });
  }

  res.json({ matchId: match.id });
});

router.post("/:sessionId/end", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = endSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const { matchId, score, winnerTeam } = parse.data;
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "ended",
      endedAt: new Date(),
      scoreJson: score || undefined,
      winnerTeam
    }
  });

  const participants = await prisma.matchParticipant.findMany({
    where: { matchId }
  });

  if (match.courtSessionId) {
    await prisma.courtSession.update({
      where: { id: match.courtSessionId },
      data: { status: "available", currentMatchId: null, nextMatchId: null }
    });
  }

  await prisma.sessionPlayer.updateMany({
    where: { sessionId, playerId: { in: participants.map((p) => p.playerId) } },
    data: {
      gamesPlayed: { increment: 1 },
      lastPlayedAt: new Date(),
      status: "checked_in"
    }
  });

  if (winnerTeam === 1 || winnerTeam === 2) {
    const winners = participants.filter((p) => p.teamNumber === winnerTeam).map((p) => p.playerId);
    const losers = participants.filter((p) => p.teamNumber !== winnerTeam).map((p) => p.playerId);
    if (winners.length) {
      await prisma.sessionPlayer.updateMany({
        where: { sessionId, playerId: { in: winners } },
        data: { wins: { increment: 1 } }
      });
    }
    if (losers.length) {
      await prisma.sessionPlayer.updateMany({
        where: { sessionId, playerId: { in: losers } },
        data: { losses: { increment: 1 } }
      });
    }
  }

  // End match sets players back to idle (checked_in) without re-queueing.

  res.json({ matchId });
});

router.post("/:sessionId/cancel", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = cancelSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const { matchId } = parse.data;
  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "cancelled",
      endedAt: new Date()
    }
  });

  const participants = await prisma.matchParticipant.findMany({
    where: { matchId }
  });

  if (match.courtSessionId) {
    await prisma.courtSession.update({
      where: { id: match.courtSessionId },
      data: { status: "available", currentMatchId: null, nextMatchId: null }
    });
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (session?.returnToQueue) {
    const teams = participants.reduce((acc, p) => {
      acc[p.teamNumber - 1].push(p.playerId);
      return acc;
    }, [[], []]);

    const maxPosition = await prisma.queueEntry.aggregate({
      where: { sessionId },
      _max: { position: true }
    });

    let position = (maxPosition._max.position || 0) + 1;
    for (const team of teams) {
      const entry = await prisma.queueEntry.create({
        data: {
          sessionId,
          type: match.matchType,
          status: "queued",
          position
        }
      });
      position += 1;
      await prisma.queueEntryPlayer.createMany({
        data: team.map((playerId) => ({ entryId: entry.id, playerId }))
      });
    }
  }

  res.json({ matchId });
});

router.get("/:sessionId/history", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const matches = await prisma.match.findMany({
    where: { sessionId, status: { in: ["ended", "cancelled"] } },
    include: { participants: { include: { player: true } } },
    orderBy: { endedAt: "desc" }
  });

  const courtSessionIds = matches
    .map((m) => m.courtSessionId)
    .filter(Boolean);

  const courtSessions = courtSessionIds.length
    ? await prisma.courtSession.findMany({
        where: { id: { in: courtSessionIds } },
        include: { court: true }
      })
    : [];

  const courtMap = new Map(courtSessions.map((cs) => [cs.id, cs]));
  const enriched = matches.map((m) => ({
    ...m,
    courtSession: m.courtSessionId ? courtMap.get(m.courtSessionId) || null : null
  }));

  res.json(enriched);
});

export default router;
