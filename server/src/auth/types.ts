import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
        tokenType: "access" | "service";
        permissions?: string[];
        featureFlags?: Record<string, boolean>;
      };
    }
  }
}

export {};
