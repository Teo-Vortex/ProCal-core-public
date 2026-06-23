import { Router } from "express";
import { getPrisma } from "../db/prisma";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

healthRouter.get("/api/health/db", async (_req, res) => {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: error instanceof Error ? error.message : "db-unavailable" });
  }
});

