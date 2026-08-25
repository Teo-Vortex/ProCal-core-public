import { Prisma, TaskInvitationStatus, TaskScope } from "@prisma/client";
import { hasPermission } from "./permissionService";

type PermissionInput = Set<string> | string[];

function permissionSet(value: PermissionInput): Set<string> {
  return value instanceof Set ? value : new Set(value || []);
}

export function activeTaskMembershipWhere(userId: string): Prisma.TaskMemberWhereInput {
  return {
    userId,
    removedAt: null,
    invitationStatus: { in: [TaskInvitationStatus.not_required, TaskInvitationStatus.accepted] }
  };
}

export function visibleTaskWhere(userId: string, _permissions: PermissionInput): Prisma.TaskWhereInput {
  return {
    isDeleted: false,
    OR: [
      {
        scope: TaskScope.personal,
        OR: [
          { ownerId: userId },
          { members: { some: activeTaskMembershipWhere(userId) } }
        ]
      },
      { scope: TaskScope.shared }
    ]
  };
}

export function canReadTaskRecord(
  task: {
    scope: TaskScope;
    source: string;
    ownerId: string | null;
    members: Array<{ userId: string; invitationStatus: TaskInvitationStatus; removedAt: Date | null }>;
  },
  userId: string,
  _permissions: PermissionInput
): boolean {
  if (task.scope === TaskScope.personal) {
    if (task.ownerId === userId) return true;
    return task.members.some((member) => member.userId === userId
      && member.removedAt == null
      && (member.invitationStatus === TaskInvitationStatus.not_required || member.invitationStatus === TaskInvitationStatus.accepted));
  }
  return true;
}

export function canManageTaskMetadata(
  task: { scope?: TaskScope; ownerId: string | null },
  userId: string,
  permissions: PermissionInput
): boolean {
  if (task.scope === TaskScope.personal && task.ownerId === userId) return true;
  const set = permissionSet(permissions);
  return hasPermission(set, "tasks.update_any")
    || (task.ownerId === userId && hasPermission(set, "tasks.update_own"));
}

export function canManageTaskMembers(
  task: { scope: TaskScope; ownerId: string | null },
  userId: string,
  permissions: PermissionInput
): boolean {
  if (task.scope === TaskScope.personal) return task.ownerId === userId;
  const set = permissionSet(permissions);
  return hasPermission(set, "tasks.update_any")
    || (task.ownerId === userId && hasPermission(set, "tasks.assign"));
}

export function canUpdateTaskMemberStatus(
  targetUserId: string,
  actorUserId: string,
  permissions: PermissionInput
): boolean {
  if (targetUserId === actorUserId) return true;
  return hasPermission(permissionSet(permissions), "tasks.update_any");
}
