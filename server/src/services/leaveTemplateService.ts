import fs from "fs";
import path from "path";
import { getConfigPath } from "../config/store";

export type LeaveTemplateField = {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page?: number;
  fontSizePt?: number;
};

export type LeaveTemplateUserOverride = {
  userId: string;
  backgroundDataUrl?: string;
  fields: LeaveTemplateField[];
  updatedAt?: string;
};

export type LeaveTemplateConfig = {
  backgroundDataUrl: string;
  fields: LeaveTemplateField[];
  userOverrides?: LeaveTemplateUserOverride[];
  updatedAt: string;
};

export type ResolvedLeaveTemplateConfig = {
  backgroundDataUrl: string;
  fields: LeaveTemplateField[];
  updatedAt: string | null;
};

function getTemplatePath(): string {
  const cfgDir = path.dirname(getConfigPath());
  return path.join(cfgDir, "leave-template.json");
}

export function loadLeaveTemplate(): LeaveTemplateConfig | null {
  const p = getTemplatePath();
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as LeaveTemplateConfig;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizeTemplateConfig(parsed);
  } catch {
    return null;
  }
}

function normalizeField(input: LeaveTemplateField): LeaveTemplateField | null {
  const key = String(input && input.key ? input.key : "").trim();
  const label = String(input && input.label ? input.label : "").trim();
  const x = Number(input && input.x);
  const y = Number(input && input.y);
  const w = Number(input && input.w);
  const h = Number(input && input.h);
  const page = Math.max(1, Math.min(20, Number((input && input.page) || 1))) || 1;
  const fontSizePtRaw = Number(input && input.fontSizePt);
  const fontSizePt = Number.isFinite(fontSizePtRaw) ? Math.max(6, Math.min(72, fontSizePtRaw)) : undefined;
  if (!key || !label) return null;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w <= 0 || h <= 0) return null;
  return {
    key,
    label,
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    w: Math.max(0.005, Math.min(1, w)),
    h: Math.max(0.005, Math.min(1, h)),
    page,
    ...(fontSizePt ? { fontSizePt } : {})
  };
}

function normalizeFields(input: unknown): LeaveTemplateField[] {
  return Array.isArray(input)
    ? input
        .map((f) => normalizeField((f || {}) as LeaveTemplateField))
        .filter((f): f is LeaveTemplateField => Boolean(f))
    : [];
}

function normalizeUserOverride(input: unknown): LeaveTemplateUserOverride | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;
  const userId = String(row.userId || "").trim();
  if (!userId) return null;
  const fields = normalizeFields(row.fields);
  const backgroundDataUrl = String(row.backgroundDataUrl || "");
  const updatedAt = String(row.updatedAt || "").trim() || undefined;
  return {
    userId,
    backgroundDataUrl,
    fields,
    ...(updatedAt ? { updatedAt } : {})
  };
}

function normalizeTemplateConfig(input: LeaveTemplateConfig): LeaveTemplateConfig | null {
  if (!input || typeof input !== "object") return null;
  const backgroundDataUrl = String(input.backgroundDataUrl || "");
  const fields = normalizeFields(input.fields);
  const userOverrides = Array.isArray((input as LeaveTemplateConfig).userOverrides)
    ? (input.userOverrides || [])
        .map((row) => normalizeUserOverride(row))
        .filter((row): row is LeaveTemplateUserOverride => Boolean(row))
    : [];
  const dedup = new Map<string, LeaveTemplateUserOverride>();
  userOverrides.forEach((row) => dedup.set(row.userId, row));
  return {
    backgroundDataUrl,
    fields,
    userOverrides: Array.from(dedup.values()),
    updatedAt: String(input.updatedAt || new Date().toISOString())
  };
}

export function saveLeaveTemplate(input: LeaveTemplateConfig): LeaveTemplateConfig {
  const p = getTemplatePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const normalized = normalizeTemplateConfig(input) || {
    backgroundDataUrl: "",
    fields: [],
    userOverrides: [],
    updatedAt: new Date().toISOString()
  };
  const payload: LeaveTemplateConfig = {
    backgroundDataUrl: normalized.backgroundDataUrl,
    fields: normalized.fields,
    userOverrides: normalized.userOverrides || [],
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(p, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export function resolveLeaveTemplateForUser(template: LeaveTemplateConfig | null, userId: string | null | undefined): ResolvedLeaveTemplateConfig {
  const base = template || null;
  const resolvedBase: ResolvedLeaveTemplateConfig = {
    backgroundDataUrl: String((base && base.backgroundDataUrl) || ""),
    fields: Array.isArray(base && base.fields) ? base!.fields : [],
    updatedAt: base ? String(base.updatedAt || "") || null : null
  };
  const uid = String(userId || "").trim();
  if (!uid || !base || !Array.isArray(base.userOverrides) || !base.userOverrides.length) return resolvedBase;
  const match = base.userOverrides.find((row) => String(row.userId || "") === uid);
  if (!match) return resolvedBase;
  return {
    backgroundDataUrl: String(match.backgroundDataUrl || resolvedBase.backgroundDataUrl || ""),
    fields: Array.isArray(match.fields) && match.fields.length ? match.fields : resolvedBase.fields,
    updatedAt: String(match.updatedAt || base.updatedAt || "") || null
  };
}
