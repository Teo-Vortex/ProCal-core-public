import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { requireRole } from "../middleware/auth";
import { requireRealmFeature } from "../middleware/requireRealmFeature";
import { writeAudit } from "../services/auditService";
import {
  checkForSystemUpdate,
  getSystemUpdateStatus,
  requestSystemRollback,
  requestSystemUpdate
} from "../services/systemUpdateService";

export const systemUpdateRouter = Router();

function requireInteractiveAccess(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.tokenType !== "access") {
    res.status(403).json({ error: "Interactive administrator access is required" });
    return;
  }
  next();
}

systemUpdateRouter.use(
  "/api/admin/system-update",
  requireRealmFeature("admin_panel"),
  requireRole(["system_admin"]),
  requireInteractiveAccess
);

systemUpdateRouter.get("/api/admin/system-update/status", async (_req, res) => {
  res.json(await getSystemUpdateStatus());
});

systemUpdateRouter.post("/api/admin/system-update/check", async (_req, res) => {
  res.json(await checkForSystemUpdate());
});

systemUpdateRouter.post("/api/admin/system-update/apply", async (req, res) => {
  const parsed = z.object({ confirmation: z.literal("UPDATE") }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: "Update confirmation is required" });
    return;
  }
  await writeAudit(req.auth!.userId, "system_update.request", "system", "core");
  const result = await requestSystemUpdate();
  res.status(result.accepted === true ? 202 : 503).json(result);
});

systemUpdateRouter.post("/api/admin/system-update/rollback", async (req, res) => {
  const parsed = z.object({ confirmation: z.literal("ROLLBACK") }).safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: "Rollback confirmation is required" });
    return;
  }
  await writeAudit(req.auth!.userId, "system_update.rollback_request", "system", "core");
  const result = await requestSystemRollback();
  res.status(result.accepted === true ? 202 : 503).json(result);
});
