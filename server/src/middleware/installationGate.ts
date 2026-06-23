import { NextFunction, Request, Response } from "express";
import { isInstalled } from "../db/installState";

const allowWhenNotInstalled = ["/health", "/setup", "/api/setup"];

export async function installationGate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const installed = await isInstalled();
  if (installed) {
    next();
    return;
  }

  const allowed = allowWhenNotInstalled.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
  if (allowed) {
    next();
    return;
  }

  if (req.path.startsWith("/api")) {
    res.status(503).json({ error: "Application not installed. Open /setup" });
    return;
  }

  res.redirect("/setup");
}
