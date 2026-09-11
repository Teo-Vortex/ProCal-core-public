const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildHolidayOccurrencesFromConfig: build } = require('../dist/services/holidayRulesService');
const fixed = (id, month, day, extras = {}) => ({ id, name: id, type: 'fixed', fixedMonth: month, fixedDay: day, dayOff: true, ...extras });
const dates = (rules, from, to) => build({ rules, easter: { enabled: false } }, from, to).filter(x => x.dayOff).map(x => x.dateKey);
test('6 September 2026 Sunday makes Monday 7 September a day off, even for a Monday-only query', () => {
  assert.deepEqual(dates([fixed('Unification', 9, 6)], '2026-09-06', '2026-09-07'), ['2026-09-06', '2026-09-07']);
  assert.deepEqual(dates([fixed('Unification', 9, 6)], '2026-09-07', '2026-09-07'), ['2026-09-07']);
});
test('two weekend days produce two distinct substitute weekdays', () => {
  assert.deepEqual(dates([fixed('Two-day holiday', 9, 5, { durationDays: 2 })], '2026-09-05', '2026-09-09'), ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08']);
});
test('substitutes skip actual holidays and already assigned substitutes', () => {
  assert.deepEqual(dates([fixed('Sunday', 9, 6), fixed('Monday', 9, 7)], '2026-09-07', '2026-09-09'), ['2026-09-07', '2026-09-08']);
});
test('duplicate rules on one date do not create two substitute days', () => {
  assert.deepEqual(dates([fixed('A', 9, 6), fixed('B', 9, 6)], '2026-09-07', '2026-09-08'), ['2026-09-07']);
});
test('a holiday at the end of a year produces a substitute in the next year', () => {
  assert.deepEqual(dates([fixed('New Year Eve', 12, 31), fixed('New Year', 1, 1)], '2024-01-01', '2024-01-03'), ['2024-01-01', '2024-01-02']);
});
test('non-days-off, disabled substitution, weekday holidays and out-of-range years do not shift', () => {
  assert.deepEqual(dates([fixed('A', 9, 6, { dayOff: false }), fixed('B', 9, 6, { observeWeekend: false }), fixed('C', 9, 6, { endYear: 2025 })], '2026-09-07', '2026-09-08'), []);
  assert.deepEqual(dates([fixed('Tuesday', 9, 8)], '2026-09-08', '2026-09-09'), ['2026-09-08']);
});
test('Easter weekend is not automatically extended, but its weekday holidays block substitutes', () => {
  const config = { rules: [fixed('Sunday', 4, 12)], easter: { enabled: true, calendar: 'orthodox', dayOff: true, offsets: [-2,-1,0,1] } };
  assert.deepEqual(build(config, '2026-04-13', '2026-04-15').map(x => x.dateKey), ['2026-04-13', '2026-04-14']);
  assert.deepEqual(build({ ...config, rules: [] }, '2026-04-14', '2026-04-15'), []);
});
