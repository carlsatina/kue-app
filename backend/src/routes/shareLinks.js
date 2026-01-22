import express from "express";
import crypto from "crypto";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const createSchema = z.object({
  playerId: z.string().uuid(),
  expiresAt: z.string().datetime().optional()
});

router.post("/:sessionId", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid input", details: parse.error.flatten() });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const link = await prisma.shareLink.create({
    data: {
      token,
      sessionId,
      playerId: parse.data.playerId,
      expiresAt: parse.data.expiresAt ? new Date(parse.data.expiresAt) : null
    }
  });
  res.json(link);
});

router.post("/:id/revoke", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const link = await prisma.shareLink.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
  res.json(link);
});

router.post("/session/:sessionId", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const token = crypto.randomBytes(24).toString("hex");
  const link = await prisma.sessionShareLink.create({
    data: {
      token,
      sessionId
    }
  });
  res.json(link);
});

router.post("/session/:id/revoke", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const link = await prisma.sessionShareLink.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
  res.json(link);
});

router.post("/session-invite/:sessionId", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { sessionId } = req.params;
  const token = crypto.randomBytes(24).toString("hex");
  const link = await prisma.sessionInviteLink.create({
    data: {
      token,
      sessionId
    }
  });
  res.json(link);
});

router.post("/session-invite/:id/revoke", requireAuth, requireRole(["admin", "staff"]), async (req, res) => {
  const { id } = req.params;
  const link = await prisma.sessionInviteLink.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
  res.json(link);
});

export default router;
