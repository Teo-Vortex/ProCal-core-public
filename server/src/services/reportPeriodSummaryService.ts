import { buildHolidayOccurrencesFromConfig, loadHolidayRules } from "./holidayRulesService";

type ReportLeaveRecord = {
  startDate: Date;
  endDate: Date;
  leaveType: string;
  status: string;
};

const DAY_MS = 86400000;
const LEAVE_TYPES = ["sick", "paid", "unpaid", "study"] as const;

export function isReportDate(value: string): boolean {
  if (!/^(19|20|21|22)\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Dates are inclusive. Count available workdays, not attendance punches.
export function calculateReportPeriodSummary(
  from: string,
  to: string,
  records: ReportLeaveRecord[],
  holidays: ReadonlySet<string>
) {
  if (!isReportDate(from) || !isReportDate(to) || from > to) throw new Error("Invalid report period");
  const firstDay = Date.parse(`${from}T00:00:00.000Z`);
  const lastDay = Date.parse(`${to}T00:00:00.000Z`);
  const absentDays = new Map<string, Set<string>>(LEAVE_TYPES.map((type) => [type, new Set()]));
  for (const record of records) {
    const dates = absentDays.get(record.leaveType);
    if (record.status !== "approved" || !dates) continue;
    const start = Math.max(firstDay, Date.parse(`${record.startDate.toISOString().slice(0, 10)}T00:00:00.000Z`));
    const end = Math.min(lastDay, Date.parse(`${record.endDate.toISOString().slice(0, 10)}T00:00:00.000Z`));
    for (let day = start; day <= end; day += DAY_MS) dates.add(new Date(day).toISOString().slice(0, 10));
  }
  const leaveByType = { paid: 0, unpaid: 0, study: 0 };
  let scheduledWorkingDays = 0;
  let sickDays = 0;
  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    const date = new Date(day);
    const key = date.toISOString().slice(0, 10);
    if ([0, 6].includes(date.getUTCDay()) || holidays.has(key)) continue;
    scheduledWorkingDays++;
    // Legacy overlapping records must never deduct the same day twice.
    const type = LEAVE_TYPES.find((candidate) => absentDays.get(candidate)!.has(key));
    if (type === "sick") sickDays++;
    else if (type) leaveByType[type]++;
  }
  const leaveDays = leaveByType.paid + leaveByType.unpaid + leaveByType.study;
  return { from, to, scheduledWorkingDays, workingDays: scheduledWorkingDays - leaveDays - sickDays, leaveDays, leaveByType, sickDays };
}

export function buildReportPeriodSummary(from: string, to: string, records: ReportLeaveRecord[]) {
  const holidays = buildHolidayOccurrencesFromConfig(loadHolidayRules(), from, to);
  return calculateReportPeriodSummary(from, to, records, new Set(holidays.filter((day) => day.dayOff).map((day) => day.dateKey)));
}
