export function toUtcDate(input: string | Date): Date {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Date(date.toISOString());
}

export function parseDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const start = from ? new Date(from) : new Date("1970-01-01T00:00:00.000Z");
  const end = to ? new Date(to) : new Date("2100-01-01T00:00:00.000Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }
  return { from: start, to: end };
}

