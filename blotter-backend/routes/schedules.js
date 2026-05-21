const express = require('express');
const db      = require('../config/db');
const { verifyToken, isKagawad } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

// ── GET /api/schedules  — list schedules (role-filtered) ─────
router.get('/', async (req, res) => {
  try {
    let query, params = [];

    if (req.user.role === 'resident') {
      // Resident sees only their own schedules
      query = `
        SELECT s.*, b.blotter_id, b.incident_type, b.complainant_name,
               b.respondent_name, u.full_name AS created_by_name
        FROM schedules s
        JOIN blotter_records b ON s.blotter_id = b.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE b.complainant_id = ?
        ORDER BY s.schedule_date ASC`;
      params = [req.user.id];
    } else {
      query = `
        SELECT s.*, b.blotter_id, b.incident_type, b.complainant_name,
               b.respondent_name, u.full_name AS created_by_name
        FROM schedules s
        JOIN blotter_records b ON s.blotter_id = b.id
        LEFT JOIN users u ON s.created_by = u.id
        ORDER BY s.schedule_date ASC`;
    }

    const [rows] = await db.query(query, params);

    // Tag: today / tomorrow / upcoming
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const tagged = rows.map(r => {
      const d = new Date(r.schedule_date); d.setHours(0,0,0,0);
      let tag = 'upcoming';
      if (d.getTime() === today.getTime())    tag = 'today';
      if (d.getTime() === tomorrow.getTime()) tag = 'tomorrow';
      return { ...r, day_tag: tag };
    });

    res.json(tagged);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/schedules/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, b.blotter_id, b.incident_type, b.complainant_name, b.respondent_name
      FROM schedules s
      JOIN blotter_records b ON s.blotter_id = b.id
      WHERE s.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Schedule not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── POST /api/schedules  — Kagawad/Captain creates schedule ──
router.post('/', isKagawad, async (req, res) => {
  const { blotter_record_id, schedule_date, location, action_type, notes } = req.body;
  if (!blotter_record_id || !schedule_date || !location || !action_type)
    return res.status(400).json({ message: 'blotter_record_id, schedule_date, location, action_type are required' });
  try {
    const [result] = await db.query(
      'INSERT INTO schedules (blotter_id, schedule_date, location, action_type, notes, created_by) VALUES (?,?,?,?,?,?)',
      [blotter_record_id, schedule_date, location, action_type, notes || null, req.user.id]
    );
    res.status(201).json({ message: 'Schedule created', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/schedules/:id  — update schedule ─────────────────
router.put('/:id', isKagawad, async (req, res) => {
  const { schedule_date, location, action_type, notes } = req.body;
  try {
    await db.query(
      'UPDATE schedules SET schedule_date=?, location=?, action_type=?, notes=? WHERE id=?',
      [schedule_date, location, action_type, notes, req.params.id]
    );
    res.json({ message: 'Schedule updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/schedules/:id ─────────────────────────────────
router.delete('/:id', isKagawad, async (req, res) => {
  try {
    await db.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
