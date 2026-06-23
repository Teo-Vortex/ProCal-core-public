import fs from "fs";
import path from "path";
import { getConfigPath } from "../config/store";

export type HolidayRuleType = "fixed" | "nth_weekday" | "relative";

export type HolidayRule = {
  id: string;
  name: string;
  dayOff?: boolean;
  type: HolidayRuleType;
  startYear?: number | null;
  endYear?: number | null;
  durationDays?: number;
  fixedMonth?: number;
  fixedDay?: number;
  nthMonth?: number;
  nthWeekday?: number;
  nthOccurrence?: number;
  baseRuleId?: string;
  offsetDays?: number;
};

export type EasterCalendarType = "orthodox" | "western";

export type EasterHolidayConfig = {
  enabled: boolean;
  calendar: EasterCalendarType;
  name: string;
  dayOff: boolean;
  offsets: number[];
  startYear?: number | null;
  endYear?: number | null;
};

export type HolidayRulesConfig = {
  rules: HolidayRule[];
  easter: EasterHolidayConfig;
  updatedAt: string;
};

export type HolidayOccurrence = {
  dateKey: string;
  names: string[];
  ruleIds: string[];
  dayOff: boolean;
};

function getRulesPath(): string {
  const cfgDir = path.dirname(getConfigPath());
  return path.join(cfgDir, "holiday-rules.json");
}

function toInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function defaultEasterConfig(): EasterHolidayConfig {
  return {
    enabled: false,
    calendar: "orthodox",
    name: "Easter",
    dayOff: true,
    offsets: [-2, -1, 0, 1],
    startYear: null,
    endYear: null
  };
}

function normalizeEasterConfig(input: Partial<EasterHolidayConfig> | null | undefined): EasterHolidayConfig {
  const base = defaultEasterConfig();
  const calendarRaw = String((input && input.calendar) || base.calendar).trim();
  const calendar: EasterCalendarType = calendarRaw === "western" ? "western" : "orthodox";
  const name = String((input && input.name) || base.name).trim() || base.name;
  const offsetsRaw: number[] = Array.isArray(input?.offsets) ? input.offsets : base.offsets;
  const offsetsUnique = Array.from(new Set((offsetsRaw || [])
    .map((v) => toInt(v))
    .filter((v): v is number => v !== null && v >= -20 && v <= 20)))
    .sort((a, b) => a - b);
  const startYear = toInt(input && input.startYear);
  const endYear = toInt(input && input.endYear);
  return {
    enabled: Boolean(input && input.enabled),
    calendar,
    name,
    dayOff: input && typeof input.dayOff === "boolean" ? input.dayOff : base.dayOff,
    offsets: offsetsUnique.length ? offsetsUnique : base.offsets,
    startYear: startYear && startYear > 1900 ? startYear : null,
    endYear: endYear && endYear > 1900 ? endYear : null
  };
}

function normalizeRule(input: HolidayRule): HolidayRule | null {
  const id = String(input && input.id || "").trim();
  const name = String(input && input.name || "").trim();
  const type = String(input && input.type || "").trim() as HolidayRuleType;
  if (!id || !name) return null;
  if (type !== "fixed" && type !== "nth_weekday" && type !== "relative") return null;

  const durationDays = Math.max(1, Math.min(31, toInt(input.durationDays) || 1));
  const startYear = toInt(input.startYear);
  const endYear = toInt(input.endYear);

  const base: HolidayRule = {
    id,
    name,
    dayOff: input && typeof input.dayOff === "boolean" ? input.dayOff : true,
    type,
    durationDays,
    startYear: startYear && startYear > 1900 ? startYear : null,
    endYear: endYear && endYear > 1900 ? endYear : null
  };

  if (type === "fixed") {
    const month = toInt(input.fixedMonth);
    const day = toInt(input.fixedDay);
    if (!month || month < 1 || month > 12) return null;
    if (!day || day < 1 || day > 31) return null;
    base.fixedMonth = month;
    base.fixedDay = day;
    return base;
  }

  if (type === "nth_weekday") {
    const month = toInt(input.nthMonth);
    const weekday = toInt(input.nthWeekday);
    const occurrence = toInt(input.nthOccurrence);
    if (!month || month < 1 || month > 12) return null;
    if (weekday === null || weekday < 0 || weekday > 6) return null;
    if (!occurrence || occurrence < -5 || occurrence > 5 || occurrence === 0) return null;
    base.nthMonth = month;
    base.nthWeekday = weekday;
    base.nthOccurrence = occurrence;
    return base;
  }

  const baseRuleId = String(input.baseRuleId || "").trim();
  const offsetDays = toInt(input.offsetDays);
  if (!baseRuleId) return null;
  if (offsetDays === null || offsetDays < -366 || offsetDays > 366) return null;
  base.baseRuleId = baseRuleId;
  base.offsetDays = offsetDays;
  return base;
}

function toDateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKeyUTC(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || (dt.getUTCMonth() + 1) !== month || dt.getUTCDate() !== day) return null;
  return dt;
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function makeUTCDate(year: number, month: number, day: number): Date | null {
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return dt;
}

function findNthWeekdayDate(year: number, month: number, weekday: number, occurrence: number): Date | null {
  if (occurrence > 0) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const delta = (weekday - first.getUTCDay() + 7) % 7;
    const dayOfMonth = 1 + delta + (occurrence - 1) * 7;
    return makeUTCDate(year, month, dayOfMonth);
  }
  const last = new Date(Date.UTC(year, month, 0));
  const delta = (last.getUTCDay() - weekday + 7) % 7;
  const dayOfMonth = last.getUTCDate() - delta - (Math.abs(occurrence) - 1) * 7;
  return makeUTCDate(year, month, dayOfMonth);
}

function computeWesternEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function computeOrthodoxEasterSunday(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianDate = new Date(Date.UTC(year, month - 1, day));
  const shiftDays = Math.floor(year / 100) - Math.floor(year / 400) - 2;
  return addDaysUTC(julianDate, shiftDays);
}

export function loadHolidayRules(): HolidayRulesConfig {
  const p = getRulesPath();
  if (!fs.existsSync(p)) return { rules: [], easter: defaultEasterConfig(), updatedAt: "" };
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as HolidayRulesConfig;
    const list = Array.isArray(parsed && parsed.rules) ? parsed.rules : [];
    const rules = list
      .map((item) => normalizeRule(item))
      .filter((item): item is HolidayRule => Boolean(item));
    return {
      rules,
      easter: normalizeEasterConfig(parsed && parsed.easter),
      updatedAt: String((parsed && parsed.updatedAt) || "")
    };
  } catch {
    return { rules: [], easter: defaultEasterConfig(), updatedAt: "" };
  }
}

export function saveHolidayRules(input: HolidayRulesConfig): HolidayRulesConfig {
  const p = getRulesPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const list = Array.isArray(input && input.rules) ? input.rules : [];
  const unique = new Map<string, HolidayRule>();
  list.forEach((item) => {
    const normalized = normalizeRule(item);
    if (!normalized) return;
    unique.set(normalized.id, normalized);
  });
  const payload: HolidayRulesConfig = {
    rules: Array.from(unique.values()),
    easter: normalizeEasterConfig(input && input.easter),
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(p, JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export function buildHolidayOccurrences(rules: HolidayRule[], fromKey: string, toKey: string): HolidayOccurrence[] {
  const from = parseDateKeyUTC(fromKey);
  const to = parseDateKeyUTC(toKey);
  if (!from || !to || from > to) return [];
  const byId = new Map<string, HolidayRule>();
  (rules || []).forEach((rule) => {
    const normalized = normalizeRule(rule);
    if (!normalized) return;
    byId.set(normalized.id, normalized);
  });

  const memo = new Map<string, Date[]>();
  const visiting = new Set<string>();

  const resolveBaseDates = (ruleId: string, year: number): Date[] => {
    const key = `${ruleId}#${year}`;
    if (memo.has(key)) return memo.get(key) || [];
    if (visiting.has(key)) return [];
    visiting.add(key);
    const out: Date[] = [];
    const rule = byId.get(ruleId);
    if (rule) {
      const startYear = Number(rule.startYear || 0);
      const endYear = Number(rule.endYear || 0);
      if ((!startYear || year >= startYear) && (!endYear || year <= endYear)) {
        if (rule.type === "fixed") {
          const dt = makeUTCDate(year, Number(rule.fixedMonth), Number(rule.fixedDay));
          if (dt) out.push(dt);
        } else if (rule.type === "nth_weekday") {
          const dt = findNthWeekdayDate(year, Number(rule.nthMonth), Number(rule.nthWeekday), Number(rule.nthOccurrence));
          if (dt) out.push(dt);
        } else if (rule.type === "relative" && rule.baseRuleId) {
          const bases = resolveBaseDates(rule.baseRuleId, year);
          const offset = Number(rule.offsetDays || 0);
          bases.forEach((dt) => out.push(addDaysUTC(dt, offset)));
        }
      }
    }
    memo.set(key, out);
    visiting.delete(key);
    return out;
  };

  const years: number[] = [];
  for (let y = from.getUTCFullYear() - 1; y <= to.getUTCFullYear() + 1; y += 1) years.push(y);

  const bucket = new Map<string, { names: Set<string>; ruleIds: Set<string>; dayOff: boolean }>();
  byId.forEach((rule) => {
    years.forEach((year) => {
      const baseDates = resolveBaseDates(rule.id, year);
      const duration = Math.max(1, Number(rule.durationDays || 1));
      baseDates.forEach((baseDate) => {
        for (let i = 0; i < duration; i += 1) {
          const dt = addDaysUTC(baseDate, i);
          if (dt < from || dt > to) continue;
          const dateKey = toDateKeyUTC(dt);
          if (!bucket.has(dateKey)) bucket.set(dateKey, { names: new Set(), ruleIds: new Set(), dayOff: false });
          const row = bucket.get(dateKey)!;
          row.names.add(rule.name);
          row.ruleIds.add(rule.id);
          if (rule.dayOff) row.dayOff = true;
        }
      });
    });
  });

  return Array.from(bucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, item]) => ({
      dateKey,
      names: Array.from(item.names.values()),
      ruleIds: Array.from(item.ruleIds.values()),
      dayOff: Boolean(item.dayOff)
    }));
}

export function buildEasterOccurrences(easter: EasterHolidayConfig, fromKey: string, toKey: string): HolidayOccurrence[] {
  const from = parseDateKeyUTC(fromKey);
  const to = parseDateKeyUTC(toKey);
  if (!from || !to || from > to) return [];
  const config = normalizeEasterConfig(easter);
  if (!config.enabled) return [];

  const years: number[] = [];
  for (let y = from.getUTCFullYear() - 1; y <= to.getUTCFullYear() + 1; y += 1) years.push(y);
  const bucket = new Map<string, HolidayOccurrence>();

  years.forEach((year) => {
    if (config.startYear && year < config.startYear) return;
    if (config.endYear && year > config.endYear) return;
    const easterSunday = config.calendar === "western"
      ? computeWesternEasterSunday(year)
      : computeOrthodoxEasterSunday(year);
    config.offsets.forEach((offset) => {
      const date = addDaysUTC(easterSunday, offset);
      if (date < from || date > to) return;
      const key = toDateKeyUTC(date);
      const suffix = offset === 0 ? "" : offset > 0 ? ` +${offset}` : ` ${offset}`;
      if (!bucket.has(key)) {
        bucket.set(key, {
          dateKey: key,
          names: [],
          ruleIds: [],
          dayOff: false
        });
      }
      const row = bucket.get(key)!;
      row.names.push(`${config.name}${suffix}`);
      row.ruleIds.push(`easter:${config.calendar}:${offset}`);
      if (config.dayOff) row.dayOff = true;
    });
  });

  return Array.from(bucket.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function buildHolidayOccurrencesFromConfig(config: HolidayRulesConfig, fromKey: string, toKey: string): HolidayOccurrence[] {
  const fixed = buildHolidayOccurrences((config && config.rules) || [], fromKey, toKey);
  const easter = buildEasterOccurrences(config && config.easter ? config.easter : defaultEasterConfig(), fromKey, toKey);
  const bucket = new Map<string, HolidayOccurrence>();
  [...fixed, ...easter].forEach((row) => {
    if (!bucket.has(row.dateKey)) {
      bucket.set(row.dateKey, {
        dateKey: row.dateKey,
        names: [],
        ruleIds: [],
        dayOff: false
      });
    }
    const target = bucket.get(row.dateKey)!;
    target.names.push(...(row.names || []));
    target.ruleIds.push(...(row.ruleIds || []));
    if (row.dayOff) target.dayOff = true;
  });
  return Array.from(bucket.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((row) => ({
      dateKey: row.dateKey,
      names: Array.from(new Set(row.names)),
      ruleIds: Array.from(new Set(row.ruleIds)),
      dayOff: row.dayOff
    }));
}
