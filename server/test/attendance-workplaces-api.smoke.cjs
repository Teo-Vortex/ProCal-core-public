// Run after replacing the isolated old image with the new dev image; see upgrade seed.
if (process.env.PROCAL_CONTAINER_NAME !== 'procal-workplace-upgrade-qa-app') throw new Error('Isolated upgrade QA stack only');
const assert = require('node:assert/strict'), fs = require('node:fs');
const { getPrisma } = require('./dist/db/prisma');
const prisma = getPrisma();
const seed = JSON.parse(fs.readFileSync('/app/config/qa-workplace-upgrade-fixtures.json','utf8'));
const base = 'http://127.0.0.1:8080';
(async () => {
 try {
  const login = async user => {
    const response = await fetch(base+'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:user.username,password:seed.password})});
    assert.equal(response.status,200); return (await response.json()).accessToken;
  };
  const adminToken = await login(seed.admin), workerToken = await login(seed.worker), raceToken = await login(seed.race);
  const call = async (url,method='GET',data,token=adminToken) => {
    const response = await fetch(base+url,{method,headers:{'content-type':'application/json',authorization:`Bearer ${token}`},...(data ? {body:JSON.stringify(data)} : {})});
    return {status:response.status,body:await response.json()};
  };
  const assertHistory = async workplace => {
    for (const before of seed.punches) {
      const after = JSON.parse(JSON.stringify(await prisma.attendancePunch.findUnique({where:{id:before.id}})));
      for (const key of Object.keys(before)) assert.deepEqual(after[key],before[key],`Legacy field ${key} changed on ${before.id}`);
      assert.equal(after.workplaceId,workplace?.id || null);
      assert.equal(after.workplaceName,workplace?.name || null);
    }
  };
  assert.equal(await prisma.attendancePunch.count(),seed.punches.length);
  await assertHistory(null);
  assert.equal((await call('/api/attendance/workplaces')).body.items.length,0);
  assert.equal((await call('/api/attendance/workplaces','POST',{name:'Forbidden'},workerToken)).status,403);
  assert.equal((await call('/api/attendance/punch','POST',{action:'check_in',workplaceId:'missing'})).status,400);
  const firstResponse = await call('/api/attendance/workplaces','POST',{name:'Офис QA'});
  assert.equal(firstResponse.status,201); const first = firstResponse.body.workplace;
  await assertHistory(first);
  const oldStation = await prisma.attendanceStation.findUnique({where:{id:seed.station.id}});
  assert.equal(oldStation.tokenHash,seed.station.tokenHash); assert.equal(oldStation.workplaceId,first.id);
  let status = await call('/api/attendance/status?userId='+seed.worker.id);
  assert.equal(status.body.state,'checked_in'); assert.equal(status.body.latest.workplaceId,first.id);
  const secondResponse = await call('/api/attendance/workplaces','POST',{name:'Склад QA'});
  assert.equal(secondResponse.status,201); const second = secondResponse.body.workplace;
  assert.equal((await call('/api/attendance/workplaces','POST',{name:first.name})).status,409);
  await assertHistory(first);
  assert.equal((await call('/api/attendance/status?userId='+seed.admin.id,'GET',null,workerToken)).status,403);
  assert.equal((await call('/api/attendance/punch','POST',{userId:seed.admin.id,action:'check_in',workplaceId:first.id},workerToken)).status,403);
  let response = await call('/api/attendance/punch','POST',{action:'check_out',workplaceId:second.id},workerToken);
  assert.equal(response.status,201); assert.equal(response.body.punch.workplaceId,first.id);
  const race = await Promise.all([call('/api/attendance/punch','POST',{action:'check_in',workplaceId:second.id},raceToken),call('/api/attendance/punch','POST',{action:'check_in',workplaceId:second.id},raceToken)]);
  assert.deepEqual(race.map(r=>r.status).sort(),[201,409]);
  const checkedIn = race.find(r=>r.status===201).body.punch;
  assert.equal(checkedIn.workplaceName,second.name);
  assert.equal((await call('/api/attendance/workplaces/'+second.id,'PATCH',{name:'Магазин QA',active:false})).status,200);
  status = await call('/api/attendance/status','GET',null,raceToken);
  assert.equal(status.body.state,'checked_in'); assert.ok(!status.body.workplaces.some(p=>p.id===second.id));
  assert.equal(status.body.latest.workplaceName,second.name);
  await prisma.attendancePunch.update({where:{id:checkedIn.id},data:{occurredAt:new Date(Date.now()-60000)}});
  response = await call('/api/attendance/punch','POST',{action:'check_out',workplaceId:first.id},raceToken);
  assert.equal(response.status,201); assert.equal(response.body.punch.workplaceId,second.id); assert.equal(response.body.punch.workplaceName,second.name);
  await prisma.attendancePunch.update({where:{id:response.body.punch.id},data:{occurredAt:new Date(Date.now()-31000)}});
  assert.equal((await call('/api/attendance/punch','POST',{action:'check_in',workplaceId:second.id},raceToken)).status,400);
  const code = await call('/api/attendance/stations/'+seed.station.id+'/code'); assert.equal(code.status,200);
  const nfc = new URL(code.body.nfcPayload);
  response = await call('/api/attendance/nfc-punch','POST',{action:'check_in',stationId:seed.station.id,token:nfc.searchParams.get('token')},raceToken);
  assert.equal(response.status,201); assert.equal(response.body.punch.workplaceId,first.id);
  const nfcPunch = response.body.punch;
  response = await call('/api/attendance/entries/'+nfcPunch.id+'/correct','POST',{action:'check_in',occurredAt:nfcPunch.occurredAt,reason:'QA correction'});
  assert.equal(response.status,201); assert.equal(response.body.punch.workplaceId,first.id);
  response = await call('/api/attendance/entries/'+response.body.punch.id+'/void','POST',{reason:'QA void'});
  assert.equal(response.status,201); assert.equal(response.body.punch.workplaceId,first.id);
  // A restored old backup has nullable new columns; the first place must still be used.
  const restored = await prisma.attendancePunch.create({data:{userId:seed.race.id,kind:'check_in',occurredAt:new Date('2026-08-01T08:00:00Z')}});
  await call('/api/attendance/workplaces');
  assert.equal((await prisma.attendancePunch.findUnique({where:{id:restored.id}})).workplaceId,first.id);
  for (const place of [first,second]) await prisma.attendancePunch.create({data:{userId:seed.admin.id,kind:'check_in',workplaceId:place.id,workplaceName:place.name,occurredAt:new Date('2026-09-15T08:00:00Z')}});
  response = await call(`/api/leave/matrix?userId=${seed.admin.id}&from=2026-09-15&to=2026-09-15&timeZone=UTC`);
  assert.equal(response.status,200);
  assert.equal(response.body.users[0].attendanceDates.length,1);
  assert.deepEqual(response.body.users[0].attendanceCells[0].workplaces.map(p=>p.name).sort(),[first.name,second.name].sort());
  // Exercise the actual multipart upload route after the Multer security update.
  const upload = async (field, bytes) => {
    const form = new FormData(); form.set('root','shared');
    form.set(field,new Blob([bytes],{type:'application/octet-stream'}),'security-upload-qa.bin');
    const result = await fetch(base+'/api/files/explorer/upload',{method:'POST',headers:{authorization:`Bearer ${adminToken}`},body:form});
    return {status:result.status,body:await result.json()};
  };
  const binary = Buffer.concat([Buffer.from('ProCal multipart QA\n','utf8'),Buffer.from([0,255,128,1])]);
  assert.equal((await upload('unexpected',binary)).status,400);
  const uploaded = await upload('file',binary);
  assert.equal(uploaded.status,201); assert.equal(uploaded.body.file.sizeBytes,binary.length);
  const downloaded = await fetch(base+'/api/files/download/'+uploaded.body.file.id,{headers:{authorization:`Bearer ${adminToken}`}});
  assert.equal(downloaded.status,200); assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),binary);
  assert.equal((await call('/api/files/explorer/files','DELETE',{fileId:uploaded.body.file.id})).status,200);
  console.log('Multipart upload smoke PASSED: invalid field rejected, next upload succeeds, binary download unchanged.');
  const backupService = require('./dist/services/backupService');
  const beforeBackup = JSON.parse(JSON.stringify(await prisma.attendancePunch.findMany({orderBy:{id:'asc'}})));
  const backupKey = require('node:crypto').randomBytes(24).toString('hex');
  const newBackup = await backupService.createBackup('full',seed.admin.id,{encryptionKey:backupKey});
  await prisma.attendanceWorkplace.update({where:{id:first.id},data:{name:'Changed after backup'}});
  await prisma.attendancePunch.create({data:{userId:seed.admin.id,kind:'check_in',workplaceId:first.id,workplaceName:first.name,occurredAt:new Date()}});
  await backupService.restoreFullBackupFromFile(newBackup.fileName,backupKey);
  assert.deepEqual(JSON.parse(JSON.stringify(await getPrisma().attendancePunch.findMany({orderBy:{id:'asc'}}))),beforeBackup);
  assert.equal((await getPrisma().attendanceWorkplace.findUnique({where:{id:first.id}})).name,first.name);
  // Restore an actual backup created by the old image, not a hand-built replacement.
  assert.ok(seed.legacyBackupFile);
  await backupService.restoreFullBackupFromFile(seed.legacyBackupFile);
  assert.equal(await getPrisma().attendancePunch.count(),seed.punches.length);
  assert.equal(await getPrisma().attendanceWorkplace.count(),0);
  await assertHistory(null);
  const restoredMeta = await getPrisma().appMeta.findUnique({where:{id:1}});
  assert.equal(restoredMeta?.installed,true,'Old backup must retain installed state');
  response = await call('/api/attendance/workplaces','POST',{name:'Историческо място QA'});
  if (response.status !== 201) console.log('Post-restore API state:',response.status,response.body.error);
  assert.equal(response.status,201);
  await assertHistory(response.body.workplace);
  status = await call('/api/attendance/status?userId='+seed.worker.id);
  assert.equal(status.body.state,'checked_in');
  assert.equal(status.body.latest.workplaceId,response.body.workplace.id);
  console.log('Backup smoke PASSED: encrypted new-format round trip and actual old-version backup restore with all legacy history preserved.');
  console.log('Workplace upgrade/API smoke PASSED: unchanged legacy history, first-place backfill, open shifts, inactive/renamed workplaces, per-person locking, permissions, NFC, correction/void inheritance and multiple workplaces per day.');
 } finally { await prisma.$disconnect(); }
})().catch(error=>{console.error(error);process.exitCode=1});
