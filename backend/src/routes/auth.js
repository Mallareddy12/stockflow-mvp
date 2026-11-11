import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../db/database.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  try {
    const { email, password, organizationName } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!organizationName || !organizationName.trim()) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOrgName = organizationName.trim();

    const db = getDatabase();

    // Check if email already registered
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    // Create organization and user in transaction
    let newUserId;
    let newOrgId;

    db.exec('BEGIN TRANSACTION;');
    try {
      const orgStmt = db.prepare('INSERT INTO organizations (name, default_low_stock_threshold) VALUES (?, 5)');
      const orgResult = orgStmt.run(cleanOrgName);
      newOrgId = Number(orgResult.lastInsertRowid);

      const userStmt = db.prepare('INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)');
      const userResult = userStmt.run(newOrgId, cleanEmail, passwordHash);
      newUserId = Number(userResult.lastInsertRowid);

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const token = generateToken({
      userId: newUserId,
      organizationId: newOrgId,
      email: cleanEmail
    });

    return res.status(201).json({
      message: 'Account and organization created successfully',
      token,
      user: {
        id: newUserId,
        email: cleanEmail,
        organizationId: newOrgId,
        organizationName: cleanOrgName,
        defaultLowStockThreshold: 5
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT u.id, u.email, u.password_hash, u.organization_id, o.name as organization_name, o.default_low_stock_threshold
      FROM users u
      JOIN organizations o ON o.id = u.organization_id
      WHERE u.email = ?
    `);
    const user = stmt.get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email
    });

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        defaultLowStockThreshold: user.default_low_stock_threshold
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: req.user
  });
});

export default router;
