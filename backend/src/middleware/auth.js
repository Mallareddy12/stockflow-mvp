import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'stockflow-mvp-jwt-secret-key-38491823';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDatabase();
    
    // Verify user & organization still exist
    const stmt = db.prepare(`
      SELECT u.id, u.email, u.organization_id, o.name as organization_name, o.default_low_stock_threshold
      FROM users u
      JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = ?
    `);
    const user = stmt.get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User or Organization no longer exists' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organization_id,
      organizationName: user.organization_name,
      defaultLowStockThreshold: user.default_low_stock_threshold
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication session' });
  }
}
