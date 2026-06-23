import type { PrismaClient, User } from "@prisma/client";

function unavailable(): never {
  throw new Error("Managed identity is not available in this build.");
}

export function isHostedIdentityEnabled(): boolean {
  return false;
}

export function isInternalStackBugRelayEnabled(): boolean {
  return false;
}

export async function mirrorHostedUserToLocal(prisma: PrismaClient, sourceUser: any, _options?: unknown): Promise<User> {
  const username = String(sourceUser?.localUsername || sourceUser?.username || "").trim();
  if (!username) unavailable();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) unavailable();
  return user;
}

export async function syncHostedRealmUsers(..._args: unknown[]): Promise<User[]> {
  return [];
}

export async function hostedRegisterRealmUser(..._args: unknown[]): Promise<never> {
  unavailable();
}

export async function hostedAuthenticateRealmUser(..._args: unknown[]): Promise<never> {
  unavailable();
}

export async function hostedUpdateRealmUser(..._args: unknown[]): Promise<any> {
  unavailable();
}

export async function hostedKickRealmUser(..._args: unknown[]): Promise<void> {
  unavailable();
}

export async function getHostedRealmPromoState(..._args: unknown[]): Promise<any> {
  unavailable();
}

export async function redeemHostedRealmPromo(..._args: unknown[]): Promise<never> {
  unavailable();
}

export async function listHostedRealmInvitations(..._args: unknown[]): Promise<any[]> {
  unavailable();
}

export async function createHostedRealmInvitation(..._args: unknown[]): Promise<any> {
  unavailable();
}

export async function cancelHostedRealmInvitation(..._args: unknown[]): Promise<any> {
  unavailable();
}

export async function hostedReportBug(..._args: unknown[]): Promise<any> {
  unavailable();
}

export async function relayInternalStackBugReport(..._args: unknown[]): Promise<any> {
  unavailable();
}
