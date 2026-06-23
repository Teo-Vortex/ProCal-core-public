import type { NextFunction, Request, Response } from "express";

export function invalidateHostedRealmAccessStateCache(): void {}

export async function hostedRealmReadOnlyGuard(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  next();
}
