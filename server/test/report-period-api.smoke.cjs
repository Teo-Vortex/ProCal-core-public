// Run inside an internal dev/beta/stable Core container: node < this-file
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { getPrisma } = require('./dist/db/prisma');
const bcrypt = require('bcrypt');
if (process.env.PROCAL_INTERNAL_AUTO_SETUP !== '1') throw new Error('Internal test stacks only');
const prisma = getPrisma();
const ids = [];
(async () => {
  try {
    const password = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(password, 4);
    const owner = await prisma.user.create({ data: { username: `report-smoke-${crypto.randomUUID()}`, passwordHash, role: 'system_admin', status: 'active' } }); ids.push(owner.id);
    const other = await prisma.user.create({ data: { username: `report-smoke-${crypto.randomUUID()}`, passwordHash, role: 'user', status: 'active' } }); ids.push(other.id);
    const leaves = [
      ['paid', '2026-08-31', '2026-09-02', 'approved'], ['study', '2026-09-03', '2026-09-03', 'approved'],
      ['unpaid', '2026-09-04', '2026-09-04', 'approved'], ['sick', '2026-09-10', '2026-09-14', 'approved'],
      ['paid', '2026-09-08', '2026-09-08', 'pending'], ['sick', '2026-09-09', '2026-09-09', 'rejected']
    ];
    for (const [leaveType, from, to, status] of leaves) await prisma.leaveRecord.create({ data: { userId: owner.id, leaveType, status, startDate: new Date(`${from}T12:00:00Z`), endDate: new Date(`${to}T12:00:00Z`), days: 99, note: 'Temporary report smoke fixture' } });
    await prisma.leaveRecord.create({ data: { userId: other.id, leaveType: 'paid', status: 'approved', startDate: new Date('2026-09-07T12:00:00Z'), endDate: new Date('2026-09-07T12:00:00Z'), days: 1 } });
    const login = async (user) => {
      const response = await fetch('http://127.0.0.1:8080/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: user.username, password }) });
      assert.equal(response.status, 200); return (await response.json()).accessToken;
    };
    const token = await login(owner);
    const get = (query, auth = token) => fetch(`http://127.0.0.1:8080/api/legacy/report-state?${query}`, { headers: { authorization: `Bearer ${auth}` } });
    let response = await get(`userId=${owner.id}&from=2026-09-01&to=2026-09-11`);
    assert.equal(response.status, 200);
    const summary = (await response.json()).periodSummary;
    const holidayResponse = await fetch('http://127.0.0.1:8080/api/holidays?from=2026-09-01&to=2026-09-11', { headers: { authorization: `Bearer ${token}` } });
    const holidays = new Set((await holidayResponse.json()).items.filter(x => x.dayOff).map(x => x.dateKey));
    const count = (days) => days.filter(day => !holidays.has(`2026-09-${String(day).padStart(2, '0')}`)).length;
    const paid = count([1, 2]), unpaid = count([4]), study = count([3]);
    assert.deepEqual(summary, { from: '2026-09-01', to: '2026-09-11', scheduledWorkingDays: count([1,2,3,4,7,8,9,10,11]), workingDays: count([7,8,9]), leaveDays: paid + unpaid + study, leaveByType: { paid, unpaid, study }, sickDays: count([10,11]) });
    response = await get(`userId=${owner.id}&from=2026-09-10&to=2026-09-10`);
    assert.equal((await response.json()).periodSummary.sickDays, count([10]));
    response = await get(`userId=${owner.id}`); assert.equal((await response.json()).periodSummary, null);
    for (const query of ['from=2026-02-30&to=2026-03-01', 'from=2026-09-11&to=2026-09-01', 'from=2026-09-01']) {
      assert.equal((await get(`userId=${owner.id}&${query}`)).status, 400);
    }
    const otherToken = await login(other);
    assert.equal((await get(`userId=${owner.id}&from=2026-09-01&to=2026-09-11`, otherToken)).status, 403);
    response = await get(`userId=${other.id}&from=2026-09-01&to=2026-09-11`, otherToken);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).periodSummary.leaveDays, count([7]));
    console.log('Report API smoke PASSED: inclusive ranges, all leave types, approval status, person isolation, own/all permissions, invalid dates and backwards compatibility.');
  } finally {
    await prisma.leaveRecord.deleteMany({ where: { userId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
