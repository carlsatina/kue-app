import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  feeMode: z.enum(["flat", "per_game"]).default("flat"),
  feeAmount: z.number().nonnegative().default(0),
  returnToQueue: z.boolean().default(true),
  announcements: z.string().optional()
});

const feeSchema = z.object({
  feeMode: z.enum(["flat", "per_game"]).optional(),
  feeAmount: z.number().nonnegative().optional()
});

router.post("/", requireAuth, requireRole(["admin"]), async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const data = parse.data;
  const session = await prisma.session.create({
    data: {
      name: data.name,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      feeMode: data.feeMode,
      feeAmount: data.feeAmount,
      returnToQueue: data.returnToQueue,
      announcements: data.announcements,
      status: "draft",
      createdBy: req.user.id
    }
  });
  res.json(session);
});

router.post("/:id/open", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const existingOpen = await prisma.session.findFirst({ where: { status: "open" } });
  if (existingOpen && existingOpen.id !== id) {
    return res.status(409).json({ error: "Another session is already open" });
  }

  const session = await prisma.session.update({
    where: { id },
    data: { status: "open", closedAt: null }
  });

  const activeCourts = await prisma.court.findMany({ where: { active: true, deletedAt: null } });
  await Promise.all(
    activeCourts.map((court) =>
      prisma.courtSession.upsert({
        where: { sessionId_courtId: { sessionId: id, courtId: court.id } },
        update: {},
        create: {
          sessionId: id,
          courtId: court.id,
          status: "available"
        }
      })
    )
  );

  res.json(session);
});

router.post("/:id/close", requireAuth, requireRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const session = await prisma.session.update({
    where: { id },
    data: { status: "closed", closedAt: new Date() }
  });
  res.json(session);
});

router.get("/active", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const session = await prisma.session.findFirst({
    where: { status: "open" }
  });
  if (!session) {
    return res.json(null);
  }

  const courtSessions = await prisma.courtSession.findMany({
    where: {
      sessionId: session.id,
      court: { deletedAt: null, active: true }
    },
    include: { court: true }
  });

  const matchIds = courtSessions
    .map((cs) => cs.currentMatchId)
    .filter(Boolean);

  const matches = matchIds.length
    ? await prisma.match.findMany({
        where: { id: { in: matchIds } },
        include: { participants: { include: { player: true } } }
      })
    : [];

  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const enrichedCourtSessions = courtSessions.map((cs) => ({
    ...cs,
    currentMatch: cs.currentMatchId ? matchMap.get(cs.currentMatchId) || null : null
  }));

  res.json({ ...session, courtSessions: enrichedCourtSessions });
});

router.get("/", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { status } = req.query;
  const where = status ? { status: String(status) } : {};
  const sessions = await prisma.session.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
  res.json(sessions);
});

router.get("/:id", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const session = await prisma.session.findUnique({
    where: { id }
  });
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const courtSessions = await prisma.courtSession.findMany({
    where: {
      sessionId: session.id,
      court: { deletedAt: null, active: true }
    },
    include: { court: true }
  });

  const matchIds = courtSessions
    .map((cs) => cs.currentMatchId)
    .filter(Boolean);

  const matches = matchIds.length
    ? await prisma.match.findMany({
        where: { id: { in: matchIds } },
        include: { participants: { include: { player: true } } }
      })
    : [];

  const matchMap = new Map(matches.map((m) => [m.id, m]));
  const enrichedCourtSessions = courtSessions.map((cs) => ({
    ...cs,
    currentMatch: cs.currentMatchId ? matchMap.get(cs.currentMatchId) || null : null
  }));

  res.json({ ...session, courtSessions: enrichedCourtSessions });
});

router.patch("/:id/fee", requireAuth, requireRole(["admin"]), async (req, res) => {
  const parse = feeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  if (parse.data.feeMode == null && parse.data.feeAmount == null) {
    return res.status(400).json({ error: "No fee updates provided" });
  }

  const session = await prisma.session.findUnique({ where: { id: req.params.id } });
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  if (session.status !== "open") {
    return res.status(409).json({ error: "Only open sessions can update fees" });
  }

  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: {
      feeMode: parse.data.feeMode ?? session.feeMode,
      feeAmount: parse.data.feeAmount ?? session.feeAmount
    }
  });
  res.json(updated);
});

router.get("/:id/players", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const sessionPlayers = await prisma.sessionPlayer.findMany({
    where: { sessionId: id },
    include: { player: true }
  });
  res.json(sessionPlayers);
});

router.get("/:id/rankings", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const sessionPlayers = await prisma.sessionPlayer.findMany({
    where: { sessionId: id },
    include: { player: true }
  });

  const ranked = sessionPlayers
    .map((sp) => {
      const winPct = sp.gamesPlayed > 0 ? sp.wins / sp.gamesPlayed : 0;
      return {
        playerId: sp.playerId,
        player: sp.player,
        gamesPlayed: sp.gamesPlayed,
        wins: sp.wins,
        losses: sp.losses,
        winPct
      };
    })
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      return (a.player.fullName || "").localeCompare(b.player.fullName || "");
    })
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  res.json({ sessionId: id, totalPlayers: ranked.length, players: ranked });
});

export default router;
