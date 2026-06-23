import crypto from "crypto";

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(24).toString("hex")}`;
}

export function hashRequestBody(body: unknown): string {
  return sha256(JSON.stringify(body ?? {}));
}

