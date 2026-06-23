import { Prisma, PrismaClient } from "@prisma/client";
import { publishLegacyStateChange } from "./realtimeSyncService";

type UserLike = {
  id: string;
  username: string;
  nickname?: string | null;
  displayColor?: string | null;
  isDeleted?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeNickname(value: string | null | undefined, fallback: string): string {
  const nickname = String(value || "").trim();
  return nickname || String(fallback || "").trim();
}

function normalizeColor(value: string | null | undefined): string {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "#64748b";
}

export async function upsertUserInSharedPersonnel(prisma: PrismaClient, user: UserLike): Promise<void> {
  if (!user || user.isDeleted) return;

  const shared = await prisma.sharedLegacyState.findUnique({ where: { id: 1 } });
  const state = asRecord(shared?.dataJson);
  const peopleRaw = Array.isArray(state.people) ? state.people : [];
  const people = peopleRaw.filter((item) => item && typeof item === "object").map((item) => ({ ...(item as Record<string, unknown>) }));

  const personId = String(user.id);
  const name = normalizeNickname(user.nickname, user.username);
  const color = normalizeColor(user.displayColor);

  const idx = people.findIndex((p) => String(p.id || "") === personId || String(p.userId || "") === personId);
  if (idx >= 0) {
    const prev = people[idx];
    const prevName = String(prev.name || "");
    const prevColor = String(prev.color || "");
    if (prevName === name && prevColor === color) return;
    people[idx] = { ...prev, id: personId, name, color, userId: personId };
  } else {
    people.push({ id: personId, name, color, userId: personId });
  }

  const nextState = { ...state, people } as Prisma.InputJsonValue;

  const saved = await prisma.sharedLegacyState.upsert({
    where: { id: 1 },
    create: { id: 1, dataJson: nextState },
    update: {
      dataJson: nextState,
      version: { increment: 1 }
    }
  });

  publishLegacyStateChange({
    mode: "shared",
    version: saved.version,
    updatedAt: saved.updatedAt.toISOString()
  });
}


