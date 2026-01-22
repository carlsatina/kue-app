import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

router.get("/player/:token", async (req, res) => {
  const { token } = req.params;
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { player: true, session: true }
  });

  if (!link || link.revokedAt) {
    return res.status(404).json({ error: "Link not found" });
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return res.status(410).json({ error: "Link expired" });
  }

  const session = link.session;
  const sessionPlayer = await prisma.sessionPlayer.findUnique({
    where: { sessionId_playerId: { sessionId: session.id, playerId: link.playerId } }
  });

  const queueEntry = await prisma.queueEntry.findFirst({
    where: {
      sessionId: session.id,
      status: "queued",
      players: { some: { playerId: link.playerId } }
    }
  });

  const queuePosition = queueEntry?.position || null;
  const isInQueue = Boolean(queueEntry);

  const currentMatch = await prisma.match.findFirst({
    where: {
      sessionId: session.id,
      status: "active",
      participants: { some: { playerId: link.playerId } }
    }
  });

  let court = null;
  if (currentMatch?.courtSessionId) {
    const courtSession = await prisma.courtSession.findUnique({
      where: { id: currentMatch.courtSessionId },
      include: { court: true }
    });
    court = courtSession?.court || null;
  }

  const estimatedWaitMinutes = queuePosition ? Math.max(0, queuePosition - 1) * 15 : null;
  const upNext = queuePosition === 1;

  res.json({
    session: { id: session.id, name: session.name, status: session.status, announcements: session.announcements },
    player: { id: link.player.id, fullName: link.player.fullName, nickname: link.player.nickname },
    status: sessionPlayer?.status || "unknown",
    inQueue: isInQueue,
    queuePosition,
    upNext,
    estimatedWaitMinutes,
    currentCourt: court,
    currentMatchId: currentMatch?.id || null
  });
});

router.get("/board/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  const courtSessions = await prisma.courtSession.findMany({
    where: { sessionId },
    include: { court: true }
  });

  const matches = await prisma.match.findMany({
    where: { sessionId, status: "active" },
    include: { participants: { include: { player: true } } }
  });

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  const board = courtSessions.map((cs) => ({
    court: cs.court,
    status: cs.status,
    currentMatch: cs.currentMatchId ? matchMap.get(cs.currentMatchId) || null : null
  }));

  res.json({ session: { id: session.id, name: session.name }, courts: board });
});

router.get("/queue/:token", async (req, res) => {
  const { token } = req.params;
  const link = await prisma.sessionShareLink.findUnique({
    where: { token },
    include: { session: true }
  });

  if (!link || link.revokedAt) {
    return res.status(404).json({ error: "Link not found" });
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return res.status(410).json({ error: "Link expired" });
  }

  const session = link.session;

  const courtSessions = await prisma.courtSession.findMany({
    where: { sessionId: session.id },
    include: { court: true }
  });

  const matches = await prisma.match.findMany({
    where: { sessionId: session.id, status: "active" },
    include: { participants: { include: { player: true } } }
  });

  const matchMap = new Map(matches.map((m) => [m.id, m]));

  const courts = courtSessions.map((cs) => ({
    court: cs.court,
    status: cs.status,
    currentMatch: cs.currentMatchId ? matchMap.get(cs.currentMatchId) || null : null
  }));

  const queueEntries = await prisma.queueEntry.findMany({
    where: { sessionId: session.id, status: "queued" },
    orderBy: { position: "asc" },
    include: { players: { include: { player: true } } }
  });

  res.json({
    session: { id: session.id, name: session.name },
    courts,
    queue: queueEntries
  });
});

export default router;
