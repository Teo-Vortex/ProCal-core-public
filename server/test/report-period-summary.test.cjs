const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateReportPeriodSummary: summarize, isReportDate } = require('../dist/services/reportPeriodSummaryService');
const record = (leaveType, from, to = from, status = 'approved') => ({ leaveType, status, startDate: new Date(`${from}T12:00:00Z`), endDate: new Date(`${to}T12:00:00Z`) });

test('clips each leave type to the inclusive report period, ignoring pending/rejected records', () => {
  const result = summarize('2026-09-01', '2026-09-11', [
    record('paid', '2026-08-31', '2026-09-02'), record('study', '2026-09-03'),
    record('unpaid', '2026-09-04'), record('sick', '2026-09-10', '2026-09-14'),
    record('paid', '2026-09-08', '2026-09-08', 'pending'), record('sick', '2026-09-09', '2026-09-09', 'rejected')
  ], new Set());
  assert.deepEqual(result, { from: '2026-09-01', to: '2026-09-11', scheduledWorkingDays: 9, workingDays: 3, leaveDays: 4, leaveByType: { paid: 2, unpaid: 1, study: 1 }, sickDays: 2 });
});

test('excludes holidays and weekends from both available days and leave totals', () => {
  const result = summarize('2026-09-04', '2026-09-08', [record('paid', '2026-09-04', '2026-09-07')], new Set(['2026-09-07']));
  assert.equal(result.scheduledWorkingDays, 2);
  assert.equal(result.leaveDays, 1);
  assert.equal(result.workingDays, 1);
});

test('counts across a year boundary without using stored whole-record totals', () => {
  const result = summarize('2025-12-31', '2026-01-05', [record('sick', '2025-12-20', '2026-01-02')], new Set(['2026-01-01']));
  assert.equal(result.scheduledWorkingDays, 3);
  assert.equal(result.sickDays, 2);
  assert.equal(result.workingDays, 1);
});

test('deduplicates overlapping records with sick leave taking precedence', () => {
  const result = summarize('2026-09-01', '2026-09-04', [record('paid', '2026-09-01', '2026-09-04'), record('paid', '2026-09-01'), record('sick', '2026-09-03')], new Set());
  assert.equal(result.workingDays, 0);
  assert.equal(result.leaveDays, 3);
  assert.equal(result.sickDays, 1);
});

test('single days, weekend-only periods and empty calendars still return totals', () => {
  assert.equal(summarize('2026-09-01', '2026-09-01', [], new Set()).workingDays, 1);
  assert.equal(summarize('2026-09-05', '2026-09-06', [], new Set()).workingDays, 0);
  assert.equal(summarize('2026-09-01', '2026-09-30', [], new Set()).workingDays, 22);
});

test('leap days and daylight-saving boundaries use calendar dates in UTC', () => {
  assert.equal(summarize('2024-02-28', '2024-03-01', [], new Set()).workingDays, 3);
  assert.equal(summarize('2026-03-27', '2026-03-30', [], new Set()).workingDays, 2);
});

test('invalid calendar dates and inverted ranges are rejected', () => {
  for (const day of ['2026-02-29', '2026-13-01', '', '2026-9-1']) assert.equal(isReportDate(day), false);
  assert.equal(isReportDate('2024-02-29'), true);
  assert.throws(() => summarize('2026-09-02', '2026-09-01', [], new Set()), /Invalid/);
});
