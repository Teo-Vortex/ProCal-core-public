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
    const matrixGet = (query, auth = token) => fetch(`http://127.0.0.1:8080/api/leave/matrix?${query}`, { headers: { authorization: `Bearer ${auth}` } });
    response = await matrixGet('from=2026-08-31&to=2026-09-02');
    assert.equal(response.status, 200);
    const matrix = await response.json();
    assert.equal(matrix.from, '2026-08-31');
    assert.equal(matrix.to, '2026-09-02');
    assert.ok(matrix.users.some(u => u.id === owner.id));
    assert.ok(matrix.users.some(u => u.id === other.id));
    assert.equal(matrix.users.find(u => u.id === owner.id).summary.paid, 1 + paid);
    assert.equal(matrix.users.find(u => u.id === owner.id).summary.sick, 0);
    response = await matrixGet(`from=2026-09-10&to=2026-09-10&userId=${owner.id}`);
    const dayMatrix = await response.json();
    assert.equal(dayMatrix.users.length, 1);
    assert.equal(dayMatrix.users[0].summary.sick, count([10]));
    response = await matrixGet('year=2026&month=9');
    assert.equal((await response.json()).from, '2026-09-01');
    for (const query of ['from=2026-02-30&to=2026-03-01', 'from=2026-09-11&to=2026-09-01', 'from=2026-09-01', 'from=2025-01-01&to=2026-09-01']) {
      assert.equal((await matrixGet(query)).status, 400);
    }
    response = await matrixGet(`from=2026-08-31&to=2026-09-11&userId=${owner.id}`, otherToken);
    const ownMatrix = await response.json();
    assert.deepEqual(ownMatrix.users.map(u => u.id), [other.id]);
    assert.ok(ownMatrix.records.every(r => r.userId === other.id));
    // Effective attendance only; corrected/voided originals must never mark work.
    const original = await prisma.attendancePunch.create({ data: { userId: owner.id, kind: 'check_in', occurredAt: new Date('2026-09-11T08:00:00Z') } });
    await prisma.attendancePunch.create({ data: { userId: owner.id, kind: 'void', occurredAt: original.occurredAt, targetPunchId: original.id, reason: 'Smoke void' } });
    const corrected = await prisma.attendancePunch.create({ data: { userId: owner.id, kind: 'check_in', occurredAt: new Date('2026-09-12T08:00:00Z') } });
    await prisma.attendancePunch.create({ data: { userId: owner.id, kind: 'check_in', occurredAt: new Date('2026-09-09T22:30:00Z'), targetPunchId: corrected.id, reason: 'Smoke correction' } });
    await prisma.attendancePunch.create({ data: { userId: other.id, kind: 'check_in', occurredAt: new Date('2026-09-08T08:00:00Z') } });
    response = await matrixGet(`from=2026-09-08&to=2026-09-12&timeZone=Europe%2FSofia&userId=${owner.id}`);
    const attendanceMatrix = await response.json();
    assert.deepEqual(attendanceMatrix.users[0].attendanceDates, ['2026-09-10']);
    assert.equal(attendanceMatrix.users[0].attendanceVisible, true);
    assert.ok(Array.isArray(attendanceMatrix.holidays));
    response = await matrixGet(`from=2026-09-09&to=2026-09-09&timeZone=UTC&userId=${owner.id}`);
    assert.deepEqual((await response.json()).users[0].attendanceDates, ['2026-09-09']);
    response = await matrixGet(`from=2026-09-09&to=2026-09-09&timeZone=Europe%2FSofia&userId=${owner.id}`);
    assert.deepEqual((await response.json()).users[0].attendanceDates, []);
    assert.equal((await matrixGet('year=2026&month=9&timeZone=Invalid')).status, 400);
    await prisma.userPermissionOverride.createMany({ data: [
      { userId: other.id, permission: 'leave.read_all', effect: 'allow' },
      { userId: other.id, permission: 'attendance.read_all', effect: 'deny' },
      { userId: other.id, permission: 'attendance.read_self', effect: 'allow' }
    ] });
    response = await matrixGet('year=2026&month=9', await login(other));
    const restrictedAttendance = await response.json();
    assert.deepEqual(restrictedAttendance.users.find(u => u.id === owner.id).attendanceDates, []);
    assert.equal(restrictedAttendance.users.find(u => u.id === owner.id).attendanceVisible, false);
    assert.deepEqual(restrictedAttendance.users.find(u => u.id === other.id).attendanceDates, ['2026-09-08']);
    console.log('Attendance matrix smoke PASSED: local day boundaries, corrections, voids, holiday metadata and scoped attendance permissions.');
    console.log('Leave matrix API smoke PASSED: all staff, exact and cross-month periods, single day, legacy month, invalid ranges and self-only access.');
    console.log('Report API smoke PASSED: inclusive ranges, all leave types, approval status, person isolation, own/all permissions, invalid dates and backwards compatibility.');
  } finally {
    await prisma.attendancePunch.deleteMany({ where: { userId: { in: ids }, targetPunchId: { not: null } } });
    await prisma.attendancePunch.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userPermissionOverride.deleteMany({ where: { userId: { in: ids } } });
    await prisma.leaveRecord.deleteMany({ where: { userId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
