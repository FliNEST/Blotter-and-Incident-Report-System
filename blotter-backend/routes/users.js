const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../config/db');
const { verifyToken, isAdmin, isCaptain } = require('../middleware/auth');

const router = express.Router();

// All routes require token
router.use(verifyToken);

// ── GET /api/users  — list all users (admin/captain only) ────
router.get('/', isCaptain, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, user_id, full_name, email, role, status, phone, address, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/users/:id ────────────────────────────────────────
router.get('/:id', isCaptain, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, user_id, full_name, email, role, status, phone, address, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/users/:id/status  — toggle active/inactive ──────
router.put('/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status))
    return res.status(400).json({ message: 'Status must be active or inactive' });
  try {
    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    await db.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'Updated user status', `User ${req.params.id} set to ${status}`]);
    res.json({ message: `User status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── PUT /api/users/:id  — update user info ────────────────────
router.put('/:id', isAdmin, async (req, res) => {
  const { full_name, email, role, phone, address } = req.body;
  try {
    await db.query(
      'UPDATE users SET full_name=?, email=?, role=?, phone=?, address=? WHERE id=?',
      [full_name, email, role, phone, address, req.params.id]
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── DELETE /api/users/:id  — admin only ──────────────────────
router.delete('/:id', isAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ message: 'Cannot delete your own account' });
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO activity_logs (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'Deleted user', `User ID ${req.params.id} deleted`]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/users/stats/summary  — admin dashboard stats ────
router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const [[{ total_users }]]  = await db.query('SELECT COUNT(*) as total_users FROM users');
    const [[{ active_users }]] = await db.query('SELECT COUNT(*) as active_users FROM users WHERE status="active"');
    const [[{ total_incidents }]] = await db.query('SELECT COUNT(*) as total_incidents FROM blotter_records');
    const [logs] = await db.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10');
    res.json({ total_users, active_users, total_incidents, recent_logs: logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
