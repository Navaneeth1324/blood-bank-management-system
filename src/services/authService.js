const crypto = require('node:crypto');
const { db } = require('../config/database');

// Hash password with salt using PBKDF2
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password
function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return key === hash;
}

// In-memory token session map
const activeSessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
    createdAt: Date.now()
  };
  activeSessions.set(token, sessionData);
  return token;
}

function getSession(token) {
  if (!token) return null;
  return activeSessions.get(token) || null;
}

function destroySession(token) {
  if (token) activeSessions.delete(token);
}

// Middleware for authentication and RBAC
function authMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || req.query.token;

    const session = getSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
      return res.status(403).json({ error: `Forbidden: Role '${session.role}' lacks permission` });
    }

    req.user = session;
    next();
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getSession,
  destroySession,
  authMiddleware
};
