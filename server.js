const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const sslEnabled = String(process.env.DB_SSL || 'true').toLowerCase() !== 'false';
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';
const caPath = path.join(__dirname, 'ca.pem');
const sslOptions = fs.existsSync(caPath)
  ? { ca: fs.readFileSync(caPath), rejectUnauthorized }
  : { rejectUnauthorized };
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  ssl: sslEnabled ? sslOptions : undefined,
  waitForConnections: true,
  connectionLimit: 10
});

app.use(express.json());
app.use(express.static(publicDir));

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}
function rowPublic(row) {
  const { password, password_hash, ...safe } = row;
  return safe;
}
function duplicate(error) { return error && error.code === 'ER_DUP_ENTRY'; }
async function q(sql, params = []) { const [rows] = await pool.query(sql, params); return rows; }
async function logActivity(userId, entityType, entityId, action, details) {
  try {
    await pool.query('INSERT INTO activity_log(user_id, entity_type, entity_id, action, details) VALUES (?,?,?,?,?)', [userId || null, entityType, entityId || null, action, details || null]);
  } catch (_) {}
}
async function getActor(req) {
  const userId = req.get('X-User-Id') || req.body?.userId || req.query?.userId;
  if (!userId) return null;
  const rows = await q('SELECT id, role, status FROM users WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0];
  return user && user.status === 'Active' ? user : null;
}
function allowRoles(...roles) {
  return async (req, res, next) => {
    try {
      const actor = await getActor(req);
      if (!actor) return res.status(401).json({ ok: false, message: 'Login required.' });
      if (!roles.includes(actor.role)) return res.status(403).json({ ok: false, message: 'Your role does not have permission for this action.' });
      req.actor = actor;
      next();
    } catch (error) {
      res.status(500).json({ ok: false, message: 'Unable to verify permission.', error: error.message });
    }
  };
}
function requireFields(res, body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    res.status(400).json({ ok: false, message: missing.join(', ') + ' required.' });
    return false;
  }
  return true;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'Server and database connection are working.' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Database connection failed.', error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { userId, password, role } = req.body;
  if (!userId || !password || !role) return res.status(400).json({ ok: false, message: 'User ID, password, and role are required.' });
  try {
    const rows = await q("SELECT * FROM users WHERE (username = ? OR email = ?) AND role = ? AND status = 'Active' LIMIT 1", [userId, userId, role]);
    const user = rows[0];
    if (!user || !(user.password === password || user.password_hash === hashPassword(password))) return res.status(401).json({ ok: false, message: 'Invalid credentials or role.' });
    res.json({ ok: true, user: rowPublic(user) });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Unable to log in.', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { fullName, email, username, password, role } = req.body;
  const allowedRoles = ['agency', 'sponsor'];
  if (!fullName || !email || !username || !password || !role) return res.status(400).json({ ok: false, message: 'Full name, email, username, password, and role are required.' });
  if (role === 'admin') return res.status(403).json({ ok: false, message: 'Admin accounts cannot be created from sign up.' });
  if (!allowedRoles.includes(role)) return res.status(400).json({ ok: false, message: 'Invalid role selected.' });
  if (String(password).length < 6) return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters.' });
  try {
    const [r] = await pool.query(
      'INSERT INTO users(full_name,email,username,password,password_hash,role,status) VALUES (?,?,?,?,?,?,?)',
      [fullName.trim(), email.trim(), username.trim(), password, hashPassword(password), role, 'Active']
    );
    const rows = await q('SELECT * FROM users WHERE id = ? LIMIT 1', [r.insertId]);
    res.json({ ok: true, message: 'Account created successfully.', user: rowPublic(rows[0]) });
  } catch (error) {
    res.status(duplicate(error) ? 409 : 500).json({
      ok: false,
      message: duplicate(error) ? 'Username or email already exists.' : 'Unable to create account.',
      error: error.message
    });
  }
});

app.get('/api/overview-data', async (req, res) => {
  try {
    const [[casesRow], [sightRow], [agencyRow], [reunionRow], [supportRow]] = await Promise.all([
      q('SELECT COUNT(*) cnt FROM missing_persons'),
      q('SELECT COUNT(*) cnt FROM sightings'),
      q('SELECT COUNT(*) cnt FROM agencies'),
      q('SELECT COUNT(*) cnt FROM reunions'),
      q("SELECT COALESCE(SUM(amount),0) total FROM support_programs WHERE status IN ('Active','Completed')")
    ]);
    const statusBreakdown = await q('SELECT status, COUNT(*) cnt FROM missing_persons GROUP BY status ORDER BY status');
    const recentSightings = await q("SELECT s.id, mp.case_no, mp.full_name, s.location, s.confidence, s.status, DATE_FORMAT(s.sighting_date, '%Y-%m-%d %H:%i') sighting_date FROM sightings s JOIN missing_persons mp ON mp.id = s.case_id ORDER BY s.sighting_date DESC LIMIT 8");
    res.json({ ok: true, counts: { cases: casesRow.cnt, sightings: sightRow.cnt, agencies: agencyRow.cnt, reunions: reunionRow.cnt, supportAmount: Number(supportRow.total || 0) }, statusBreakdown, recentSightings });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load overview data.', error: error.message });
  }
});

app.get('/api/dashboard-data', async (req, res) => {
  try {
    const [persons, agencies, sightings, rehabilitation, supportPrograms, reunions, activityLogs] = await Promise.all([
      q('SELECT mp.*, a.agency_name FROM missing_persons mp LEFT JOIN agencies a ON a.id = mp.assigned_agency_id ORDER BY mp.created_at DESC'),
      q('SELECT * FROM agencies ORDER BY agency_name'),
      q('SELECT s.*, mp.case_no, mp.full_name FROM sightings s JOIN missing_persons mp ON mp.id = s.case_id ORDER BY s.sighting_date DESC'),
      q('SELECT rr.*, mp.case_no, mp.full_name FROM rehabilitation_records rr JOIN missing_persons mp ON mp.id = rr.person_id ORDER BY rr.updated_at DESC'),
      q('SELECT sp.*, mp.case_no, mp.full_name FROM support_programs sp JOIN missing_persons mp ON mp.id = sp.person_id ORDER BY sp.id DESC'),
      q('SELECT r.*, mp.case_no, mp.full_name FROM reunions r JOIN missing_persons mp ON mp.id = r.person_id ORDER BY r.reunion_date DESC'),
      q('SELECT * FROM activity_log ORDER BY action_time DESC LIMIT 100')
    ]);
    res.json({ ok: true, persons, agencies, sightings, rehabilitation, supportPrograms, reunions, activityLogs });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load dashboard data.', error: error.message });
  }
});

app.get('/api/lookups', async (req, res) => {
  try {
    const [persons, agencies] = await Promise.all([
      q('SELECT id AS person_id, case_no, full_name, status FROM missing_persons ORDER BY case_no'),
      q('SELECT id AS agency_id, agency_code, agency_name FROM agencies ORDER BY agency_name')
    ]);
    res.json({ ok: true, persons, agencies });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Failed to load lookups.', error: error.message });
  }
});

app.get('/api/agencies', async (req, res) => {
  try { res.json({ ok: true, agencies: await q('SELECT * FROM agencies ORDER BY agency_name') }); }
  catch (error) { res.status(500).json({ ok: false, message: 'Failed to load agencies.', error: error.message }); }
});
app.post('/api/agencies', allowRoles('admin'), async (req, res) => {
  if (!requireFields(res, req.body, ['agencyCode','agencyName','agencyType'])) return;
  const b = req.body;
  try {
    const [r] = await pool.query('INSERT INTO agencies(agency_code,agency_name,agency_type,contact_person,phone,email,address,city,state) VALUES (?,?,?,?,?,?,?,?,?)', [b.agencyCode,b.agencyName,b.agencyType,b.contactPerson||null,b.phone||null,b.email||null,b.address||null,b.city||null,b.state||null]);
    await logActivity(b.userId,'agency',r.insertId,'created',b.agencyName);
    res.json({ ok:true, agencyId:r.insertId, message:'Agency added.' });
  } catch(error) {
    res.status(duplicate(error)?409:500).json({ ok:false, message: duplicate(error)?'Agency code already exists.':'Failed to save agency.', error:error.message });
  }
});
app.put('/api/agencies/:id', allowRoles('admin'), async (req, res) => {
  const b = req.body;
  try {
    await pool.query('UPDATE agencies SET agency_code=?,agency_name=?,agency_type=?,contact_person=?,phone=?,email=?,address=?,city=?,state=? WHERE id=?', [b.agencyCode,b.agencyName,b.agencyType,b.contactPerson||null,b.phone||null,b.email||null,b.address||null,b.city||null,b.state||null,req.params.id]);
    await logActivity(b.userId,'agency',req.params.id,'updated',b.agencyName);
    res.json({ ok:true, message:'Agency updated.' });
  } catch(error) { res.status(500).json({ ok:false, message:'Failed to update agency.', error:error.message }); }
});
app.delete('/api/agencies/:id', allowRoles('admin'), async (req, res) => {
  try { await pool.query('DELETE FROM agencies WHERE id=?',[req.params.id]); res.json({ ok:true, message:'Agency deleted.' }); }
  catch(error) { res.status(500).json({ ok:false, message:'Failed to delete agency.', error:error.message }); }
});

app.get('/api/persons', async (req, res) => {
  try { res.json({ ok:true, persons: await q('SELECT mp.*, a.agency_name FROM missing_persons mp LEFT JOIN agencies a ON a.id=mp.assigned_agency_id ORDER BY mp.created_at DESC') }); }
  catch(error) { res.status(500).json({ ok:false, message:'Failed to load cases.', error:error.message }); }
});
app.post('/api/persons', allowRoles('admin', 'agency'), async (req,res) => {
  if (!requireFields(res, req.body, ['caseNo','fullName'])) return;
  const b=req.body;
  try {
    const [r]=await pool.query('INSERT INTO missing_persons(case_no,full_name,gender,age,guardian_name,guardian_phone,last_seen_date,last_seen_location,identifying_marks,photo_url,status,rehabilitation_status,assigned_agency_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [b.caseNo,b.fullName,b.gender||'Unknown',b.age||null,b.guardianName||null,b.guardianPhone||null,b.lastSeenDate||null,b.lastSeenLocation||null,b.identifyingMarks||null,b.photoUrl||null,b.status||'Missing',b.rehabilitationStatus||'Not Started',b.assignedAgencyId||null]);
    await logActivity(b.userId,'missing_person',r.insertId,'created',b.caseNo);
    res.json({ok:true, personId:r.insertId, message:'Case added.'});
  } catch(error) { res.status(duplicate(error)?409:500).json({ok:false,message:duplicate(error)?'Case number already exists.':'Failed to save case.',error:error.message}); }
});
app.put('/api/persons/:id', allowRoles('admin', 'agency'), async (req,res) => {
  const b=req.body;
  try {
    await pool.query('UPDATE missing_persons SET case_no=?,full_name=?,gender=?,age=?,guardian_name=?,guardian_phone=?,last_seen_date=?,last_seen_location=?,identifying_marks=?,photo_url=?,status=?,rehabilitation_status=?,assigned_agency_id=? WHERE id=?', [b.caseNo,b.fullName,b.gender||'Unknown',b.age||null,b.guardianName||null,b.guardianPhone||null,b.lastSeenDate||null,b.lastSeenLocation||null,b.identifyingMarks||null,b.photoUrl||null,b.status||'Missing',b.rehabilitationStatus||'Not Started',b.assignedAgencyId||null,req.params.id]);
    await logActivity(b.userId,'missing_person',req.params.id,'updated',b.caseNo);
    res.json({ok:true,message:'Case updated.'});
  } catch(error) { res.status(500).json({ok:false,message:'Failed to update case.',error:error.message}); }
});
app.delete('/api/persons/:id', allowRoles('admin', 'agency'), async (req,res) => {
  try { await pool.query('DELETE FROM missing_persons WHERE id=?',[req.params.id]); res.json({ok:true,message:'Case deleted.'}); }
  catch(error) { res.status(500).json({ok:false,message:'Failed to delete case.',error:error.message}); }
});

app.get('/api/sightings', async (req, res) => {
  try { res.json({ ok:true, sightings: await q('SELECT s.*, mp.case_no, mp.full_name FROM sightings s JOIN missing_persons mp ON mp.id=s.case_id ORDER BY s.sighting_date DESC') }); }
  catch(error) { res.status(500).json({ ok:false, message:'Failed to load sightings.', error:error.message }); }
});
app.post('/api/sightings', allowRoles('admin', 'agency'), async (req,res) => {
  if(!requireFields(res,req.body,['caseId','reportedByName','location','sightingDate'])) return;
  const b=req.body;
  try{
    const [r]=await pool.query('INSERT INTO sightings(case_id,reported_by_name,reporter_phone,location,sighting_date,confidence,status,notes) VALUES (?,?,?,?,?,?,?,?)',[b.caseId,b.reportedByName,b.reporterPhone||null,b.location,b.sightingDate,b.confidence||'Medium',b.status||'New',b.notes||null]);
    await logActivity(b.userId,'sighting',r.insertId,'created',b.location);
    res.json({ok:true,sightingId:r.insertId,message:'Sighting recorded.'});
  } catch(error) { res.status(500).json({ok:false,message:'Failed to save sighting.',error:error.message}); }
});
app.put('/api/sightings/:id', allowRoles('admin', 'agency'), async (req,res) => {
  const b=req.body;
  try{
    await pool.query('UPDATE sightings SET case_id=?,reported_by_name=?,reporter_phone=?,location=?,sighting_date=?,confidence=?,status=?,notes=? WHERE id=?',[b.caseId,b.reportedByName,b.reporterPhone||null,b.location,b.sightingDate,b.confidence||'Medium',b.status||'New',b.notes||null,req.params.id]);
    await logActivity(b.userId,'sighting',req.params.id,'updated',b.location);
    res.json({ok:true,message:'Sighting updated.'});
  } catch(error) { res.status(500).json({ok:false,message:'Failed to update sighting.',error:error.message}); }
});
app.delete('/api/sightings/:id', allowRoles('admin', 'agency'), async (req,res) => {
  try { await pool.query('DELETE FROM sightings WHERE id=?',[req.params.id]); res.json({ok:true,message:'Sighting deleted.'}); }
  catch(error) { res.status(500).json({ok:false,message:'Failed to delete sighting.',error:error.message}); }
});

function crudRecords(route, table, responseKey, idName, selectSql, insertSql, updateSql, fields, label, writeRoles = ['admin']) {
  app.get('/api/' + route, async (req, res) => {
    try { res.json({ ok:true, [responseKey]: await q(selectSql) }); }
    catch(error) { res.status(500).json({ ok:false, message:'Failed to load records.', error:error.message }); }
  });
  app.post('/api/' + route, allowRoles(...writeRoles), async (req,res) => {
    const b=req.body;
    if(!requireFields(res,b,fields.required)) return;
    try{
      const [r]=await pool.query(insertSql, fields.values(b));
      await logActivity(b.userId,table,r.insertId,'created',label(b));
      res.json({ok:true,[idName]:r.insertId,message:'Record added.'});
    } catch(error) { res.status(500).json({ok:false,message:'Failed to save record.',error:error.message}); }
  });
  app.put('/api/' + route + '/:id', allowRoles(...writeRoles), async (req,res) => {
    const b=req.body;
    try{
      await pool.query(updateSql, [...fields.values(b), req.params.id]);
      await logActivity(b.userId,table,req.params.id,'updated',label(b));
      res.json({ok:true,message:'Record updated.'});
    } catch(error) { res.status(500).json({ok:false,message:'Failed to update record.',error:error.message}); }
  });
  app.delete('/api/' + route + '/:id', allowRoles(...writeRoles), async (req,res) => {
    try { await pool.query('DELETE FROM ' + table + ' WHERE id=?',[req.params.id]); res.json({ok:true,message:'Record deleted.'}); }
    catch(error) { res.status(500).json({ok:false,message:'Failed to delete record.',error:error.message}); }
  });
}

crudRecords('rehabilitation','rehabilitation_records','rehabilitation','rehabId','SELECT rr.*, mp.case_no, mp.full_name FROM rehabilitation_records rr JOIN missing_persons mp ON mp.id=rr.person_id ORDER BY rr.updated_at DESC','INSERT INTO rehabilitation_records(person_id,shelter_name,health_status,counselling_status,education_support,status,notes) VALUES (?,?,?,?,?,?,?)','UPDATE rehabilitation_records SET person_id=?,shelter_name=?,health_status=?,counselling_status=?,education_support=?,status=?,notes=? WHERE id=?',{required:['personId'],values:b=>[b.personId,b.shelterName||null,b.healthStatus||null,b.counsellingStatus||null,b.educationSupport||null,b.status||'Pending',b.notes||null]},b=>b.personId,['admin','agency']);
crudRecords('support-programs','support_programs','support-programs','supportId','SELECT sp.*, mp.case_no, mp.full_name FROM support_programs sp JOIN missing_persons mp ON mp.id=sp.person_id ORDER BY sp.id DESC','INSERT INTO support_programs(person_id,sponsor_name,sponsor_phone,support_type,amount,start_date,status,notes) VALUES (?,?,?,?,?,?,?,?)','UPDATE support_programs SET person_id=?,sponsor_name=?,sponsor_phone=?,support_type=?,amount=?,start_date=?,status=?,notes=? WHERE id=?',{required:['personId','sponsorName','supportType'],values:b=>[b.personId,b.sponsorName,b.sponsorPhone||null,b.supportType,b.amount||0,b.startDate||null,b.status||'Planned',b.notes||null]},b=>b.sponsorName,['admin','sponsor']);
crudRecords('reunions','reunions','reunions','reunionId','SELECT r.*, mp.case_no, mp.full_name FROM reunions r JOIN missing_persons mp ON mp.id=r.person_id ORDER BY r.reunion_date DESC','INSERT INTO reunions(person_id,reunion_date,family_contact,verified_by,outcome,notes) VALUES (?,?,?,?,?,?)','UPDATE reunions SET person_id=?,reunion_date=?,family_contact=?,verified_by=?,outcome=?,notes=? WHERE id=?',{required:['personId','reunionDate','familyContact'],values:b=>[b.personId,b.reunionDate,b.familyContact,b.verifiedBy||null,b.outcome||'Reunited',b.notes||null]},b=>b.familyContact,['admin','agency']);

app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.listen(port, '0.0.0.0', () => console.log('Server running at http://0.0.0.0:' + port));
