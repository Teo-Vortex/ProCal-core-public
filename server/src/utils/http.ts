import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional()
});

export function parseIfMatchVersion(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/W\//g, "").replace(/\"/g, "").trim();
  const asNumber = Number(cleaned);
  if (!Number.isInteger(asNumber) || asNumber < 1) return undefined;
  return asNumber;
}

export function etagFromVersion(version: number): string {
  return `\"${version}\"`;
}

