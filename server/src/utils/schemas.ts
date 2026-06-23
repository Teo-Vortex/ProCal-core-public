import { z } from "zod";

const roleEnum = z.enum(["system_admin", "admin", "boss", "hr", "pr", "user", "role_a", "role_b", "role_c", "role_d"]);

export const credentialsSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const publicRegisterSchema = z.object({
  username: z.string().min(3).max(64),
  nickname: z.string().min(2).max(64),
  fullName: z.string().min(3).max(191),
  workplace: z.string().min(2).max(191),
  jobTitle: z.string().min(2).max(191),
  password: z.string().min(8).max(128)
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(64),
  nickname: z.string().min(2).max(64).optional(),
  fullName: z.string().min(3).max(191),
  workplace: z.string().min(2).max(191),
  jobTitle: z.string().min(2).max(191),
  password: z.string().min(8).max(128),
  role: roleEnum.default("user"),
  status: z.enum(["pending", "active", "suspended"]).default("active"),
  viewMode: z.enum(["simple", "tasks"]).default("simple"),
  displayColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  calendarTintOpacity: z.coerce.number().int().min(0).max(100).optional()
});

export const adminUserPatchSchema = z.object({
  username: z.string().min(3).max(64).optional(),
  nickname: z.string().min(2).max(64).nullable().optional(),
  fullName: z.string().min(3).max(191).nullable().optional(),
  workplace: z.string().min(2).max(191).nullable().optional(),
  jobTitle: z.string().min(2).max(191).nullable().optional(),
  role: roleEnum.optional(),
  status: z.enum(["pending", "active", "suspended"]).optional(),
  viewMode: z.enum(["simple", "tasks"]).optional(),
  displayColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  calendarTintOpacity: z.coerce.number().int().min(0).max(100).optional()
}).refine((v) => v.username || v.nickname !== undefined || v.fullName !== undefined || v.workplace !== undefined || v.jobTitle !== undefined || v.role || v.status || v.viewMode || v.displayColor !== undefined || v.calendarTintOpacity !== undefined, {
  message: "No patch fields provided"
});

export const adminUserPasswordSchema = z.object({
  password: z.string().min(8).max(128)
});

export const mePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128)
});
export const mePreferencesSchema = z.object({
  viewMode: z.enum(["simple", "tasks"])
});

export const meProfileSchema = z.object({
  nickname: z.string().min(2).max(64),
  fullName: z.string().min(3).max(191),
  workplace: z.string().min(2).max(191),
  jobTitle: z.string().min(2).max(191)
});

export const createTokenSchema = z.object({
  name: z.string().min(2).max(120),
  userId: z.string().optional()
});

export const eventCreateSchema = z.object({
  date: z.string().datetime(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  scope: z.enum(["private", "team", "global"]).optional()
});

export const eventPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: z.string().datetime().optional(),
  description: z.string().max(4000).nullable().optional(),
  scope: z.enum(["private", "team", "global"]).optional(),
  version: z.number().int().positive().optional()
});

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  dueAt: z.string().datetime().optional(),
  remindAt: z.string().datetime().optional(),
  ownerId: z.string().optional()
});

export const taskPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  remindAt: z.string().datetime().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  version: z.number().int().positive().optional()
});

export const noteCreateSchema = z.object({
  text: z.string().min(1).max(4000),
  visibility: z.enum(["private", "team"])
});

export const notePatchSchema = z.object({
  text: z.string().min(1).max(4000).optional(),
  visibility: z.enum(["private", "team"]).optional(),
  version: z.number().int().positive().optional()
});
