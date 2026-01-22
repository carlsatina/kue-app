import express from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const enqueueSchema = z.object({
  type: z.enum(["singles", "doubles"]),
  playerIds: z.array(z.string().uuid()).min(1).max(2)
});

const dequeueSchema = z.object({
  entryId: z.string().uuid()
});

const reorderSchema = z.object({
  orderedEntryIds: z.array(z.string().uuid()).min(1)
});

router.get("/:sessionId", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const entries = await prisma.queueEntry.findMany({
    where: { sessionId, status: "queued" },
    orderBy: { position: "asc" },
    include: { players: { include: { player: true } } }
  });
  res.json(entries);
});

router.post("/:sessionId/enqueue", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = enqueueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const { type, playerIds } = parse.data;

  if (type === "singles" && playerIds.length !== 1) {
    return res.status(400).json({ error: "Singles requires 1 player" });
  }
  if (type === "doubles" && playerIds.length !== 2) {
    return res.status(400).json({ error: "Doubles requires 2 players" });
  }

  const existing = await prisma.queueEntryPlayer.findMany({
    where: { playerId: { in: playerIds }, entry: { sessionId, status: "queued" } },
    include: { entry: true }
  });
  if (existing.length > 0) {
    return res.status(409).json({ error: "One or more players already in queue" });
  }

  const maxPosition = await prisma.queueEntry.aggregate({
    where: { sessionId },
    _max: { position: true }
  });
  const position = (maxPosition._max.position || 0) + 1;

  const entry = await prisma.queueEntry.create({
    data: {
      sessionId,
      type,
      status: "queued",
      position
    }
  });

  await prisma.queueEntryPlayer.createMany({
    data: playerIds.map((playerId) => ({ entryId: entry.id, playerId }))
  });

  const fullEntry = await prisma.queueEntry.findUnique({
    where: { id: entry.id },
    include: { players: { include: { player: true } } }
  });

  res.json(fullEntry);
});

router.post("/:sessionId/dequeue", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const parse = dequeueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const { entryId } = parse.data;
  const entry = await prisma.queueEntry.update({
    where: { id: entryId },
    data: { status: "removed" }
  });
  res.json(entry);
});

router.post("/:sessionId/away", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const parse = dequeueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }
  const { entryId } = parse.data;
  const entry = await prisma.queueEntry.update({
    where: { id: entryId },
    data: { status: "removed" }
  });
  res.json(entry);
});

router.post("/:sessionId/reorder", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = reorderSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const updates = parse.data.orderedEntryIds.map((entryId, idx) =>
    prisma.queueEntry.update({
      where: { id: entryId },
      data: { position: idx + 1, manualOrder: true }
    })
  );

  await prisma.$transaction(updates);
  const entries = await prisma.queueEntry.findMany({
    where: { sessionId, status: "queued" },
    orderBy: { position: "asc" },
    include: { players: { include: { player: true } } }
  });
  res.json(entries);
});

export default router;
