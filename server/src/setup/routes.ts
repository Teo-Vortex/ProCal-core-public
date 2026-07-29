import { Router } from "express";
import crypto from "crypto";
import { loadStoredConfig } from "../config/store";
import { firstAdminSchema, registerFirstAdmin } from "../setup/installer";
import { getPrisma } from "../db/prisma";
import { isInstalled } from "../db/installState";

export const setupRouter = Router();
type FirstAdminInput = Parameters<typeof registerFirstAdmin>[0];

function getExpectedSetupToken(): string {
  return String(process.env.FIRST_ADMIN_SETUP_TOKEN || process.env.PROCAL_SETUP_TOKEN || "").trim();
}

function setupTokenMatches(providedValue: unknown): boolean {
  const expected = getExpectedSetupToken();
  const provided = typeof providedValue === "string" ? providedValue.trim() : "";
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

setupRouter.post("/api/setup/test-connection", async (_req, res) => {
  res.status(410).json({
    ok: false,
    error: "External DB setup is disabled. Use bundled stack with internal database."
  });
});

setupRouter.post("/api/setup/install", async (_req, res) => {
  if (await isInstalled()) {
    res.status(409).json({ ok: false, error: "Already installed" });
    return;
  }

  if (!loadStoredConfig()) {
    res.status(503).json({
      ok: false,
      error: "Internal database is not configured. Start with docker-compose bundle stack."
    });
    return;
  }

  res.status(410).json({
    ok: false,
    error: "Direct install endpoint is disabled. Use /api/setup/register-first-admin."
  });
});

setupRouter.post("/api/setup/register-first-admin", async (req, res) => {
  if (await isInstalled()) {
    res.status(409).json({ ok: false, error: "Already installed" });
    return;
  }

  if (!loadStoredConfig()) {
    res.status(503).json({
      ok: false,
      error: "Internal database is not configured. Start with docker-compose bundle stack."
    });
    return;
  }

  if (!getExpectedSetupToken()) {
    res.status(503).json({
      ok: false,
      error: "Initial setup is locked because FIRST_ADMIN_SETUP_TOKEN is not configured."
    });
    return;
  }

  if (!setupTokenMatches(req.body?.setupToken)) {
    res.status(403).json({ ok: false, error: "Invalid setup token" });
    return;
  }

  try {
    let setupInput: FirstAdminInput;
    const parsed = firstAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    setupInput = parsed.data;

    const lockedAdminUsername = String(process.env.FIRST_ADMIN_USERNAME || "").trim();
    const adminUsername = lockedAdminUsername || setupInput.adminUsername;
    const result = await registerFirstAdmin(
      lockedAdminUsername
        ? { ...setupInput, adminUsername: lockedAdminUsername }
        : setupInput
    );

    res.json({ ok: true, serviceToken: result.serviceToken });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Register failed" });
  }
});

setupRouter.get("/api/setup/status", async (_req, res) => {
  const dbConfigured = Boolean(loadStoredConfig());

  try {
    if (!dbConfigured) {
      res.json({ installed: false, dbConfigured: false, mode: "admin-bootstrap" });
      return;
    }

    const prisma = getPrisma();
    const meta = await prisma.appMeta.findUnique({ where: { id: 1 } });
    res.json({
      installed: Boolean(meta?.installed),
      dbConfigured: true,
      setupTokenConfigured: Boolean(getExpectedSetupToken()),
      mode: "admin-bootstrap"
    });
  } catch {
    res.json({ installed: false, dbConfigured, mode: "admin-bootstrap" });
  }
});
