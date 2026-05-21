const express = require('express');
const multer  = require('multer');
const path    = require('path');
const db      = require('../config/db');
const { verifyToken, isKagawad, isCaptain } = require('../middleware/auth');

const router = express.Router();

// ── File upload config ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, process.env.UPLOAD_PATH || './uploads'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|mp4|mp3|wav|doc|docx/;
    allowed.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('File type not allowed'));
  }
});

router.use(verifyToken);

// ── Helper: generate next blotter_id ─────────────────────────
async function genBlotterId() {
  const [[row]] = await db.query('SELECT COUNT(*) as cnt FROM blotter_records');
  const num = String(row.cnt + 1).padStart(4, '0');
  return `BLT-${new Date().getFullYear()}-${num}`;
}

// ════════════════════════════════════════════════════════════
// POST /api/blotter  — Resident submits new complaint
// ════════════════════════════════════════════════════════════
router.post('/', upload.fields([
  { name: 'official_signature', maxCount: 1 },
  { name: 'complainant_signature', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]), async (req, res) => {
  const {
    complainant_name, complainant_phone, complainant_address, complainant_relation,
    respondent_name,  respondent_phone,  respondent_address,
    incident_types,   incident_location, incident_datetime, incident_description,
    barangay_actions, official_name
  } = req.body;

  if (!complainant_name || !respondent_name || !incident_types)
    return res.status(400).json({ message: 'Required fields are missing' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const blotter_id     = await genBlotterId();
    const off_sig_path   = req.files?.official_signature?.[0]?.filename   || null;
    const comp_sig_path  = req.files?.complainant_signature?.[0]?.filename || null;
    const complainant_id = req.user.role === 'resident' ? req.user.id : null;

    // Insert main record
    const [result] = await conn.query(`
      INSERT INTO blotter_records
        (blotter_id, complainant_id, complainant_name, complainant_phone, complainant_address, complainant_relation,
         respondent_name, respondent_phone, respondent_address,
         incident_type, incident_location, incident_datetime, incident_description,
         status, updated_by, official_name, official_signature, complainant_signature)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?,?,?,?)`,
      [blotter_id, complainant_id,
       complainant_name, complainant_phone, complainant_address, complainant_relation,
       respondent_name, respondent_phone, respondent_address,
       Array.isArray(incident_types) ? incident_types.join(', ') : incident_types,
       incident_location, incident_datetime || null, incident_description,
       req.user.id, official_name, off_sig_path, comp_sig_path]
    );
    const record_id = result.insertId;

    // Insert incident types (multiple checkboxes)
    const types = Array.isArray(incident_types) ? incident_types : [incident_types];
    for (const t of types) {
      await conn.query('INSERT INTO blotter_incident_types (blotter_id, type_name) VALUES (?,?)', [record_id, t]);
    }

    // Insert barangay actions if provided
    if (barangay_actions) {
      const actions = Array.isArray(barangay_actions) ? barangay_actions : [barangay_actions];
      for (const a of actions) {
        await conn.query('INSERT INTO barangay_actions (blotter_id, action_name) VALUES (?,?)', [record_id, a]);
      }
    }

    // Insert attachments
    if (req.files?.attachments) {
      for (const file of req.files.attachments) {
        await conn.query(
          'INSERT INTO attachments (blotter_id, uploaded_by, file_name, file_path, file_type, file_size) VALUES (?,?,?,?,?,?)',
          [record_id, req.user.id, file.originalname, file.filename, file.mimetype, file.size]
        );
      }
    }

    // Log
    await conn.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'Submitted blotter report', blotter_id]);

    await conn.commit();
    res.status(201).json({ message: 'Blotter report submitted successfully', blotter_id });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    conn.release();
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/blotter  — list records (role-filtered)
// ════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  const { status, type, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  // Resident only sees their own records
  if (req.user.role === 'resident') {
    where.push('b.complainant_id = ?');
    params.push(req.user.id);
  }
  if (status) { where.push('b.status = ?');             params.push(status); }
  if (type)   { where.push('b.incident_type LIKE ?');   params.push(`%${type}%`); }
  if (search) {
    where.push('(b.blotter_id LIKE ? OR b.complainant_name LIKE ? OR b.respondent_name LIKE ? OR b.incident_location LIKE ?)');
    params.push(...[`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const [rows] = await db.query(`
      SELECT b.*,
        u1.full_name AS assigned_to_name,
        u2.full_name AS updated_by_name
      FROM blotter_records b
      LEFT JOIN users u1 ON b.assigned_to = u1.id
      LEFT JOIN users u2 ON b.updated_by  = u2.id
      ${whereSQL}
      ORDER BY b.reported_at DESC
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM blotter_records b ${whereSQL}`, params
    );
    res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/blotter/:id  — get single record with full details
// ════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*,
        u1.full_name AS assigned_to_name,
        u2.full_name AS updated_by_name
      FROM blotter_records b
      LEFT JOIN users u1 ON b.assigned_to = u1.id
      LEFT JOIN users u2 ON b.updated_by  = u2.id
      WHERE b.id = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Record not found' });

    // Restrict resident access
    if (req.user.role === 'resident' && rows[0].complainant_id !== req.user.id)
      return res.status(403).json({ message: 'Access denied' });

    const [types]   = await db.query('SELECT type_name FROM blotter_incident_types WHERE blotter_id = ?', [req.params.id]);
    const [actions] = await db.query('SELECT action_name FROM barangay_actions WHERE blotter_id = ?', [req.params.id]);
    const [notes]   = await db.query(`
      SELECT n.*, u.full_name AS noted_by_name
      FROM investigation_notes n
      LEFT JOIN users u ON n.noted_by = u.id
      WHERE n.blotter_id = ? ORDER BY n.created_at DESC`, [req.params.id]
    );
    const [files]   = await db.query(`
      SELECT a.*, u.full_name AS uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.blotter_id = ?`, [req.params.id]
    );

    res.json({ ...rows[0], incident_types: types, barangay_actions: actions, notes, attachments: files });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/blotter/:id/status  — Kagawad/Captain updates status
// ════════════════════════════════════════════════════════════
router.put('/:id/status', isKagawad, async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'investigating', 'resolved', 'archived'];
  if (!allowed.includes(status))
    return res.status(400).json({ message: 'Invalid status' });
  try {
    await db.query('UPDATE blotter_records SET status = ?, updated_by = ? WHERE id = ?',
      [status, req.user.id, req.params.id]);
    await db.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'Updated blotter status', `Record ${req.params.id} → ${status}`]);
    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// PUT /api/blotter/:id/assign  — Captain assigns to kagawad
// ════════════════════════════════════════════════════════════
router.put('/:id/assign', isCaptain, async (req, res) => {
  const { assigned_to } = req.body;
  try {
    await db.query('UPDATE blotter_records SET assigned_to = ?, updated_by = ? WHERE id = ?',
      [assigned_to, req.user.id, req.params.id]);
    res.json({ message: 'Record assigned successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/blotter/:id/notes  — Kagawad adds investigation note
// ════════════════════════════════════════════════════════════
router.post('/:id/notes', isKagawad, async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ message: 'Notes are required' });
  try {
    await db.query(
      'INSERT INTO investigation_notes (blotter_id, noted_by, notes) VALUES (?,?,?)',
      [req.params.id, req.user.id, notes]
    );
    res.status(201).json({ message: 'Investigation note added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// POST /api/blotter/:id/attachments  — Upload evidence files
// ════════════════════════════════════════════════════════════
router.post('/:id/attachments', upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: 'No files uploaded' });
  try {
    for (const file of req.files) {
      await db.query(
        'INSERT INTO attachments (blotter_id, uploaded_by, file_name, file_path, file_type, file_size) VALUES (?,?,?,?,?,?)',
        [req.params.id, req.user.id, file.originalname, file.filename, file.mimetype, file.size]
      );
    }
    res.status(201).json({ message: `${req.files.length} file(s) uploaded successfully` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// DELETE /api/blotter/:id  — Admin/Captain only
// ════════════════════════════════════════════════════════════
router.delete('/:id', isCaptain, async (req, res) => {
  try {
    await db.query('DELETE FROM blotter_records WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'Deleted blotter record', `Record ID ${req.params.id}`]);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// GET /api/blotter/stats/dashboard  — Dashboard summary
// ════════════════════════════════════════════════════════════
router.get('/stats/dashboard', isKagawad, async (req, res) => {
  try {
    const [[{ total }]]        = await db.query('SELECT COUNT(*) as total FROM blotter_records');
    const [[{ pending }]]      = await db.query('SELECT COUNT(*) as pending FROM blotter_records WHERE status="pending"');
    const [[{ investigating }]]= await db.query('SELECT COUNT(*) as investigating FROM blotter_records WHERE status="investigating"');
    const [[{ resolved }]]     = await db.query('SELECT COUNT(*) as resolved FROM blotter_records WHERE status="resolved"');
    const [recent]             = await db.query('SELECT blotter_id, incident_type, status, reported_at FROM blotter_records ORDER BY reported_at DESC LIMIT 5');
    res.json({ total, pending, investigating, resolved, recent });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
