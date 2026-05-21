const jwt = require('jsonwebtoken');

// ── Verify token ─────────────────────────────────────────────
const verifyToken = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });

  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ── Role guard factory ────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied: insufficient role' });
  }
  next();
};

// Shorthand guards
const isAdmin    = requireRole('admin');
const isCaptain  = requireRole('admin', 'captain');
const isKagawad  = requireRole('admin', 'captain', 'kagawad');
const isResident = requireRole('admin', 'captain', 'kagawad', 'resident');

module.exports = { verifyToken, requireRole, isAdmin, isCaptain, isKagawad, isResident };
