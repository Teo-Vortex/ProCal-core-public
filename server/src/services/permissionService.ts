import { UserRole } from "@prisma/client";
import { getPrisma } from "../db/prisma";

export const KNOWN_PERMISSIONS = [
  "*",
  "reports.read_self",
  "reports.read_all",
  "comp.read_self",
  "comp.read_all",
  "comp.manage",
  "sync.read",
  "events.read",
  "events.read_all",
  "events.create",
  "events.update",
  "events.delete",
  "tasks.read",
  "tasks.read_all",
  "tasks.create",
  "tasks.assign",
  "tasks.update_own",
  "tasks.update_any",
  "tasks.delete_own",
  "tasks.delete_any",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "users.approve",
  "roles.read",
  "roles.update",
  "permissions.manage",
  "notes.read",
  "notes.create",
  "notes.update",
  "notes.delete",
  "leave.read_self",
  "leave.read_all",
  "leave.manage",
  "attendance.read_self",
  "attendance.punch",
  "attendance.read_all",
  "attendance.manage",
  "inventory.read",
  "inventory.receive",
  "inventory.issue",
  "inventory.transfer",
  "inventory.count",
  "inventory.items.manage",
  "inventory.settings.manage",
  "inventory.reports",
  "media.read",
  "media.create",
  "media.update",
  "media.delete",
  "media.export",
  "chat.read",
  "chat.write",
  "backups.manage"
] as const;

export type PermissionKey = (typeof KNOWN_PERMISSIONS)[number] | string;

function isUnrestrictedAdmin(role: UserRole): boolean {
  return role === "system_admin";
}

const SUBSTITUTION_BLOCKED_PERMISSIONS = new Set<string>([
  "*",
  "permissions.manage",
  "backups.manage"
]);

const SUBSTITUTION_BLOCKED_PREFIXES = [
  "users.",
  "roles."
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  system_admin: ["*"],
  admin: [
    "reports.read_self",
    "reports.read_all",
    "comp.read_self",
    "comp.read_all",
    "comp.manage",
    "sync.read",
    "events.read",
    "events.read_all",
    "events.create",
    "events.update",
    "events.delete",
    "tasks.read",
    "tasks.read_all",
    "tasks.create",
    "tasks.assign",
    "tasks.update_any",
    "tasks.delete_any",
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "users.approve",
    "roles.read",
    "roles.update",
    "permissions.manage",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete",
    "leave.read_self",
    "leave.read_all",
    "leave.manage",
    "attendance.read_self",
    "attendance.punch",
    "attendance.read_all",
    "attendance.manage",
    "inventory.read",
    "inventory.receive",
    "inventory.issue",
    "inventory.transfer",
    "inventory.count",
    "inventory.items.manage",
    "inventory.settings.manage",
    "inventory.reports",
    "media.read",
    "media.create",
    "media.update",
    "media.delete",
    "media.export",
    "chat.read",
    "chat.write",
    "backups.manage"
  ],
  boss: [
    "reports.read_self",
    "reports.read_all",
    "comp.read_self",
    "comp.read_all",
    "comp.manage",
    "sync.read",
    "events.read",
    "events.read_all",
    "events.create",
    "events.update",
    "events.delete",
    "tasks.read",
    "tasks.read_all",
    "tasks.create",
    "tasks.assign",
    "tasks.update_own",
    "tasks.update_any",
    "tasks.delete_own",
    "tasks.delete_any",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete",
    "leave.read_self",
    "leave.read_all",
    "leave.manage",
    "attendance.read_self",
    "attendance.punch",
    "attendance.read_all",
    "attendance.manage",
    "inventory.read",
    "inventory.reports",
    "media.read",
    "media.create",
    "media.update",
    "media.delete",
    "media.export",
    "chat.read",
    "chat.write"
  ],
  hr: [
    "reports.read_self",
    "comp.read_self",
    "sync.read",
    "events.read",
    "events.read_all",
    "events.create",
    "events.update",
    "events.delete",
    "tasks.read",
    "tasks.read_all",
    "tasks.create",
    "tasks.update_own",
    "tasks.delete_own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete",
    "leave.read_self",
    "leave.read_all",
    "leave.manage",
    "attendance.read_self",
    "attendance.punch",
    "attendance.read_all",
    "attendance.manage",
    "chat.read",
    "chat.write"
  ],
  pr: [
    "reports.read_self",
    "comp.read_self",
    "sync.read",
    "events.read",
    "events.read_all",
    "events.create",
    "events.update",
    "events.delete",
    "tasks.read",
    "tasks.read_all",
    "tasks.create",
    "tasks.update_own",
    "tasks.delete_own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete",
    "leave.read_self",
    "attendance.read_self",
    "attendance.punch",
    "media.read",
    "media.create",
    "media.update",
    "media.delete",
    "media.export",
    "chat.read",
    "chat.write"
  ],
  user: [
    "reports.read_self",
    "comp.read_self",
    "sync.read",
    "events.read",
    "events.read_all",
    "events.create",
    "events.update",
    "events.delete",
    "tasks.read",
    "tasks.read_all",
    "tasks.create",
    "tasks.update_own",
    "tasks.delete_own",
    "notes.read",
    "notes.create",
    "notes.update",
    "notes.delete",
    "leave.read_self",
    "attendance.read_self",
    "attendance.punch",
    "chat.read",
    "chat.write"
  ],
  role_a: [],
  role_b: [],
  role_c: [],
  role_d: []
};

const DEFAULT_ROLE_NAMES: Record<UserRole, string> = {
  system_admin: "System Admin",
  admin: "Admin",
  boss: "Boss",
  hr: "HR",
  pr: "PR",
  user: "User",
  role_a: "Role A",
  role_b: "Role B",
  role_c: "Role C",
  role_d: "Role D"
};

function parsePermissionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((p) => String(p || "").trim()).filter(Boolean);
  }
  if (value && typeof value === "object" && Array.isArray((value as { permissions?: unknown }).permissions)) {
    return ((value as { permissions: unknown[] }).permissions || [])
      .map((p) => String(p || "").trim())
      .filter(Boolean);
  }
  return [];
}

function todayNoonUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0, 0));
}

function canDelegateSubstitutionPermission(permission: string): boolean {
  const value = String(permission || "").trim();
  if (!value || SUBSTITUTION_BLOCKED_PERMISSIONS.has(value)) return false;
  return !SUBSTITUTION_BLOCKED_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export async function getRolePermissions(role: UserRole): Promise<string[]> {
  const prisma = getPrisma();
  const policy = await prisma.rolePolicy.findUnique({ where: { role } });
  if (!policy) return DEFAULT_ROLE_PERMISSIONS[role] || [];
  const custom = parsePermissionList(policy.permissionsJson);
  return custom.length ? custom : DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export async function getRoleDisplayName(role: UserRole): Promise<string> {
  const prisma = getPrisma();
  const policy = await prisma.rolePolicy.findUnique({ where: { role }, select: { displayName: true } });
  const fallback = DEFAULT_ROLE_NAMES[role] || role;
  return (policy?.displayName || "").trim() || fallback;
}

async function getDirectEffectivePermissions(userId: string, role: UserRole): Promise<Set<string>> {
  if (isUnrestrictedAdmin(role)) {
    // Admin roles are never restricted by role policy or user overrides.
    return new Set<string>(["*"]);
  }

  const prisma = getPrisma();
  const base = await getRolePermissions(role);
  const set = new Set<string>(base);

  const overrides = await prisma.userPermissionOverride.findMany({ where: { userId } });
  for (const o of overrides) {
    if (o.effect === "deny") {
      set.delete(o.permission);
      continue;
    }
    set.add(o.permission);
  }

  return set;
}

async function addActiveSubstitutionPermissions(set: Set<string>, userId: string): Promise<void> {
  const prisma = getPrisma();
  const activeDate = todayNoonUtc();
  const substitutions = await prisma.leaveRecord.findMany({
    where: {
      substituteUserId: userId,
      status: "approved",
      startDate: { lte: activeDate },
      endDate: { gte: activeDate },
      user: {
        isDeleted: false,
        status: "active"
      }
    },
    select: {
      user: {
        select: {
          id: true,
          role: true
        }
      }
    }
  });

  for (const row of substitutions) {
    if (!row.user || row.user.id === userId) continue;
    const delegated = await getDirectEffectivePermissions(row.user.id, row.user.role);
    for (const permission of delegated) {
      if (canDelegateSubstitutionPermission(permission)) {
        set.add(permission);
      }
    }
  }
}

export async function getEffectivePermissions(userId: string, role: UserRole): Promise<Set<string>> {
  if (isUnrestrictedAdmin(role)) {
    return new Set<string>(["*"]);
  }

  const set = await getDirectEffectivePermissions(userId, role);
  await addActiveSubstitutionPermissions(set, userId);
  return set;
}

export function hasPermission(permissionSet: Set<string> | undefined, permission: PermissionKey): boolean {
  if (!permissionSet) return false;
  if (permissionSet.has("*")) return true;
  return permissionSet.has(permission);
}

export function listDefaultRolePermissions(): Record<UserRole, string[]> {
  return DEFAULT_ROLE_PERMISSIONS;
}

export function listDefaultRoleNames(): Record<UserRole, string> {
  return DEFAULT_ROLE_NAMES;
}

export async function upsertRolePermissions(role: UserRole, permissions: string[]): Promise<void> {
  const prisma = getPrisma();
  await prisma.rolePolicy.upsert({
    where: { role },
    create: { role, permissionsJson: permissions },
    update: { permissionsJson: permissions }
  });
}

export async function upsertRoleDisplayName(role: UserRole, displayName: string | null): Promise<void> {
  const prisma = getPrisma();
  const value = (displayName || "").trim() || null;
  await prisma.rolePolicy.upsert({
    where: { role },
    create: { role, displayName: value, permissionsJson: DEFAULT_ROLE_PERMISSIONS[role] || [] },
    update: { displayName: value }
  });
}

export async function resetRolePermissions(role: UserRole): Promise<void> {
  const prisma = getPrisma();
  await prisma.rolePolicy.deleteMany({ where: { role } });
}

export async function setUserPermissionOverrides(
  userId: string,
  payload: { allow?: string[]; deny?: string[]; clear?: string[] }
): Promise<void> {
  const prisma = getPrisma();

  const allow = (payload.allow || []).map((p) => p.trim()).filter(Boolean);
  const deny = (payload.deny || []).map((p) => p.trim()).filter(Boolean);
  const clear = (payload.clear || []).map((p) => p.trim()).filter(Boolean);

  if (clear.length) {
    await prisma.userPermissionOverride.deleteMany({ where: { userId, permission: { in: clear } } });
  }

  for (const permission of allow) {
    await prisma.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      create: { userId, permission, effect: "allow" },
      update: { effect: "allow" }
    });
  }

  for (const permission of deny) {
    await prisma.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      create: { userId, permission, effect: "deny" },
      update: { effect: "deny" }
    });
  }
}
