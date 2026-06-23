export function invalidateRealmEntitlementsCache(): void {}

export async function getRealmEntitlements(): Promise<null> {
  return null;
}

export async function getRealmFeatureFlags(): Promise<Record<string, boolean>> {
  return {};
}

export function isFeatureEnabledInFlags(flags: Record<string, boolean> | null | undefined, key: string): boolean {
  if (!flags || typeof flags !== "object" || !key) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(flags, key)) {
    return true;
  }
  return Boolean(flags[key]);
}
