const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND status = "active"', [email]
    );
    if (!rows.length)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, user_id: user.user_id, name: user.full_name, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?,?,?)',
      [user.id, 'User logged in', req.ip]
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, user_id: user.user_id, name: user.full_name, role: user.role, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/auth/register   (Admin only via admin panel)
// Body: { full_name, email, password, role, phone, address }
// ────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { full_name, email, password, role = 'resident', phone, address } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ message: 'full_name, email, and password are required' });

  try {
    // Check duplicate
    const [exist] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (exist.length) return res.status(409).json({ message: 'Email already in use' });

    // Auto-generate user_id
    const [last] = await db.query('SELECT user_id FROM users ORDER BY id DESC LIMIT 1');
    const lastNum = last.length ? parseInt(last[0].user_id.replace('U', '')) : 0;
    const user_id = 'U' + String(lastNum + 1).padStart(3, '0');

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      'INSERT INTO users (user_id, full_name, email, password, role, phone, address) VALUES (?,?,?,?,?,?,?)',
      [user_id, full_name, email, hashed, role, phone || null, address || null]
    );

    res.status(201).json({ message: 'User registered successfully', user_id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/auth/me   — get current user profile
// ────────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, user_id, full_name, email, role, status, phone, address, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ────────────────────────────────────────────────────────────
router.put('/change-password', verifyToken, async (req, res) => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password)
    return res.status(400).json({ message: 'Both old and new passwords are required' });

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(old_password, rows[0].password);
    if (!match) return res.status(401).json({ message: 'Old password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
