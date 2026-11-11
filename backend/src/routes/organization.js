import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/organization
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const org = db.prepare(`
      SELECT id, name, default_low_stock_threshold, created_at, updated_at
      FROM organizations
      WHERE id = ?
    `).get(req.user.organizationId);

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      organization: {
        id: org.id,
        name: org.name,
        defaultLowStockThreshold: org.default_low_stock_threshold,
        createdAt: org.created_at,
        updatedAt: org.updated_at
      }
    });
  } catch (error) {
    console.error('Fetch org error:', error);
    res.status(500).json({ error: 'Failed to retrieve organization settings' });
  }
});

// PUT /api/organization
router.put('/', (req, res) => {
  try {
    const { name, defaultLowStockThreshold } = req.body;
    const db = getDatabase();

    const currentOrg = db.prepare('SELECT id, name, default_low_stock_threshold FROM organizations WHERE id = ?')
      .get(req.user.organizationId);

    if (!currentOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    let updatedName = currentOrg.name;
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Organization name cannot be empty' });
      }
      updatedName = name.trim();
    }

    let updatedThreshold = currentOrg.default_low_stock_threshold;
    if (defaultLowStockThreshold !== undefined) {
      const parsed = parseInt(defaultLowStockThreshold, 10);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Default Low Stock Threshold must be a non-negative integer' });
      }
      updatedThreshold = parsed;
    }

    db.prepare(`
      UPDATE organizations
      SET name = ?, default_low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedName, updatedThreshold, req.user.organizationId);

    res.json({
      message: 'Organization settings updated successfully',
      organization: {
        id: req.user.organizationId,
        name: updatedName,
        defaultLowStockThreshold: updatedThreshold
      }
    });
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ error: 'Failed to update organization settings' });
  }
});

export default router;
