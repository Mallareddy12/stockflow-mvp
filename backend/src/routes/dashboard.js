import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/dashboard
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const orgId = req.user.organizationId;

    const org = db.prepare('SELECT default_low_stock_threshold, name FROM organizations WHERE id = ?')
      .get(orgId);
    const defaultThreshold = org ? org.default_low_stock_threshold : 5;

    // Fetch all products for org
    const products = db.prepare(`
      SELECT 
        id,
        name,
        sku,
        description,
        quantity_on_hand,
        cost_price,
        selling_price,
        low_stock_threshold,
        last_updated_by,
        updated_at
      FROM products
      WHERE organization_id = ?
      ORDER BY updated_at DESC
    `).all(orgId);

    const totalProducts = products.length;
    let totalQuantity = 0;
    let totalInventoryValue = 0;
    const lowStockItems = [];

    for (const p of products) {
      totalQuantity += p.quantity_on_hand;
      if (p.cost_price !== null && p.cost_price !== undefined) {
        totalInventoryValue += (p.quantity_on_hand * p.cost_price);
      }

      const effectiveThreshold = p.low_stock_threshold !== null && p.low_stock_threshold !== undefined
        ? p.low_stock_threshold
        : defaultThreshold;

      if (p.quantity_on_hand <= effectiveThreshold) {
        lowStockItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          quantityOnHand: p.quantity_on_hand,
          lowStockThreshold: p.low_stock_threshold,
          effectiveThreshold,
          costPrice: p.cost_price,
          sellingPrice: p.selling_price,
          updatedAt: p.updated_at
        });
      }
    }

    res.json({
      summary: {
        totalProducts,
        totalQuantity,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        lowStockCount: lowStockItems.length,
        defaultLowStockThreshold: defaultThreshold,
        organizationName: org ? org.name : req.user.organizationName
      },
      lowStockItems
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard metrics' });
  }
});

export default router;
