const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { hashPassword, verifyPassword, createSession, getSession, destroySession } = require('../services/authService');

// Register
router.post('/register', (req, res) => {
  try {
    const { email, password, role, fullName, phone } = req.body;
    if (!email || !password || !role || !fullName || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validRoles = ['ADMIN', 'STAFF', 'HOSPITAL', 'DONOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role specified' });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = hashPassword(password);
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, role, full_name, phone)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(email, passwordHash, role, fullName, phone);
    const userId = Number(result.lastInsertRowid);

    const user = { id: userId, email, role, full_name: fullName, phone };
    const token = createSession(user);

    res.status(201).json({ message: 'User registered successfully', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createSession(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current user profile
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = getSession(token);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({ user: session });
});

// Logout
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  destroySession(token);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
