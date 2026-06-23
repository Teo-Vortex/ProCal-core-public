import type { NextFunction, Request, Response } from "express";
import { isFeatureEnabledInFlags } from "../services/realmEntitlementsService";

export function requireRealmFeature(featureKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isFeatureEnabledInFlags(req.auth?.featureFlags || {}, featureKey)) {
      next();
      return;
    }

    res.status(403).json({
      error: "Feature disabled by current plan.",
      missingFeature: featureKey
    });
  };
}
