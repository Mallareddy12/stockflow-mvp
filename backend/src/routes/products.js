import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /api/products - list all products for current org with optional ?search=
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    const db = getDatabase();

    // Fetch org default threshold
    const org = db.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = ?')
      .get(req.user.organizationId);
    const defaultThreshold = org ? org.default_low_stock_threshold : 5;

    let query = `
      SELECT 
        p.id,
        p.organization_id,
        p.name,
        p.sku,
        p.description,
        p.quantity_on_hand,
        p.cost_price,
        p.selling_price,
        p.low_stock_threshold,
        p.last_updated_by,
        p.created_at,
        p.updated_at
      FROM products p
      WHERE p.organization_id = ?
    `;
    const params = [req.user.organizationId];

    if (search && search.trim()) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += ` ORDER BY p.updated_at DESC, p.id DESC`;

    const rows = db.prepare(query).all(...params);

    const products = rows.map(p => {
      const effectiveThreshold = p.low_stock_threshold !== null && p.low_stock_threshold !== undefined
        ? p.low_stock_threshold
        : defaultThreshold;
      return {
        ...p,
        effective_threshold: effectiveThreshold,
        is_low_stock: p.quantity_on_hand <= effectiveThreshold
      };
    });

    res.json({
      products,
      defaultThreshold,
      total: products.length
    });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET /api/products/:id - get single product
router.get('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const product = db.prepare(`
      SELECT * FROM products WHERE id = ? AND organization_id = ?
    `).get(req.params.id, req.user.organizationId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const org = db.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = ?')
      .get(req.user.organizationId);
    const defaultThreshold = org ? org.default_low_stock_threshold : 5;
    const effectiveThreshold = product.low_stock_threshold !== null && product.low_stock_threshold !== undefined
      ? product.low_stock_threshold
      : defaultThreshold;

    res.json({
      product: {
        ...product,
        effective_threshold: effectiveThreshold,
        is_low_stock: product.quantity_on_hand <= effectiveThreshold
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// POST /api/products - create product
router.post('/', (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!sku || !sku.trim()) {
      return res.status(400).json({ error: 'SKU is required' });
    }

    const cleanName = name.trim();
    const cleanSku = sku.trim().toUpperCase();
    const cleanDesc = description ? description.trim() : null;

    const parsedQty = quantityOnHand !== undefined && quantityOnHand !== null && quantityOnHand !== ''
      ? parseInt(quantityOnHand, 10)
      : 0;
    if (isNaN(parsedQty) || parsedQty < 0) {
      return res.status(400).json({ error: 'Quantity on hand must be a non-negative integer' });
    }

    let parsedCost = null;
    if (costPrice !== undefined && costPrice !== null && costPrice !== '') {
      parsedCost = parseFloat(costPrice);
      if (isNaN(parsedCost) || parsedCost < 0) {
        return res.status(400).json({ error: 'Cost price must be a non-negative number' });
      }
    }

    let parsedSelling = null;
    if (sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== '') {
      parsedSelling = parseFloat(sellingPrice);
      if (isNaN(parsedSelling) || parsedSelling < 0) {
        return res.status(400).json({ error: 'Selling price must be a non-negative number' });
      }
    }

    let parsedThreshold = null;
    if (lowStockThreshold !== undefined && lowStockThreshold !== null && lowStockThreshold !== '') {
      parsedThreshold = parseInt(lowStockThreshold, 10);
      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        return res.status(400).json({ error: 'Low stock threshold must be a non-negative integer' });
      }
    }

    const db = getDatabase();

    // Check SKU uniqueness within organization
    const existingSku = db.prepare(`
      SELECT id FROM products WHERE organization_id = ? AND sku = ? COLLATE NOCASE
    `).get(req.user.organizationId, cleanSku);

    if (existingSku) {
      return res.status(409).json({ error: `SKU "${cleanSku}" already exists in your organization` });
    }

    const stmt = db.prepare(`
      INSERT INTO products (
        organization_id, name, sku, description, quantity_on_hand,
        cost_price, selling_price, low_stock_threshold, last_updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.organizationId,
      cleanName,
      cleanSku,
      cleanDesc,
      parsedQty,
      parsedCost,
      parsedSelling,
      parsedThreshold,
      req.user.email
    );

    const newId = Number(result.lastInsertRowid);
    const createdProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(newId);

    // If initial stock was given > 0, log an initial stock entry
    if (parsedQty > 0) {
      db.prepare(`
        INSERT INTO stock_adjustments (
          organization_id, product_id, delta, quantity_before, quantity_after, note, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.organizationId, newId, parsedQty, 0, parsedQty, 'Initial stock on creation', req.user.email);
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: createdProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id - update product
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      sku,
      description,
      quantityOnHand,
      costPrice,
      sellingPrice,
      lowStockThreshold
    } = req.body;

    const db = getDatabase();

    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?')
      .get(id, req.user.organizationId);

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: 'Product name cannot be empty' });
    }
    const cleanName = name !== undefined ? name.trim() : existingProduct.name;

    let cleanSku = existingProduct.sku;
    if (sku !== undefined) {
      if (!sku || !sku.trim()) {
        return res.status(400).json({ error: 'SKU cannot be empty' });
      }
      cleanSku = sku.trim().toUpperCase();

      // Check SKU uniqueness (ignore current product id)
      const duplicate = db.prepare(`
        SELECT id FROM products WHERE organization_id = ? AND sku = ? COLLATE NOCASE AND id != ?
      `).get(req.user.organizationId, cleanSku, id);

      if (duplicate) {
        return res.status(409).json({ error: `SKU "${cleanSku}" already exists on another product in your organization` });
      }
    }

    const cleanDesc = description !== undefined
      ? (description ? description.trim() : null)
      : existingProduct.description;

    let newQty = existingProduct.quantity_on_hand;
    if (quantityOnHand !== undefined && quantityOnHand !== null && quantityOnHand !== '') {
      const parsed = parseInt(quantityOnHand, 10);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Quantity on hand must be a non-negative integer' });
      }
      newQty = parsed;
    }

    let newCost = existingProduct.cost_price;
    if (costPrice !== undefined) {
      if (costPrice === null || costPrice === '') {
        newCost = null;
      } else {
        const parsed = parseFloat(costPrice);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'Cost price must be a non-negative number' });
        }
        newCost = parsed;
      }
    }

    let newSelling = existingProduct.selling_price;
    if (sellingPrice !== undefined) {
      if (sellingPrice === null || sellingPrice === '') {
        newSelling = null;
      } else {
        const parsed = parseFloat(sellingPrice);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'Selling price must be a non-negative number' });
        }
        newSelling = parsed;
      }
    }

    let newThreshold = existingProduct.low_stock_threshold;
    if (lowStockThreshold !== undefined) {
      if (lowStockThreshold === null || lowStockThreshold === '') {
        newThreshold = null;
      } else {
        const parsed = parseInt(lowStockThreshold, 10);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: 'Low stock threshold must be a non-negative integer' });
        }
        newThreshold = parsed;
      }
    }

    // Check if quantity changed directly to log adjustment
    const delta = newQty - existingProduct.quantity_on_hand;
    if (delta !== 0) {
      db.prepare(`
        INSERT INTO stock_adjustments (
          organization_id, product_id, delta, quantity_before, quantity_after, note, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.organizationId,
        id,
        delta,
        existingProduct.quantity_on_hand,
        newQty,
        'Manual direct edit in product form',
        req.user.email
      );
    }

    db.prepare(`
      UPDATE products SET
        name = ?,
        sku = ?,
        description = ?,
        quantity_on_hand = ?,
        cost_price = ?,
        selling_price = ?,
        low_stock_threshold = ?,
        last_updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND organization_id = ?
    `).run(
      cleanName,
      cleanSku,
      cleanDesc,
      newQty,
      newCost,
      newSelling,
      newThreshold,
      req.user.email,
      id,
      req.user.organizationId
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    res.json({
      message: 'Product updated successfully',
      product: updated
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// POST /api/products/:id/adjust-stock - Quick stock adjustment (FR-5)
router.post('/:id/adjust-stock', (req, res) => {
  try {
    const { id } = req.params;
    const { delta, note } = req.body;

    const parsedDelta = parseInt(delta, 10);
    if (isNaN(parsedDelta) || parsedDelta === 0) {
      return res.status(400).json({ error: 'Adjustment delta must be a non-zero integer (+N or -N)' });
    }

    const db = getDatabase();
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?')
      .get(id, req.user.organizationId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentQty = product.quantity_on_hand;
    const newQty = currentQty + parsedDelta;

    if (newQty < 0) {
      return res.status(400).json({
        error: `Cannot reduce stock by ${Math.abs(parsedDelta)}. Current stock is only ${currentQty} units.`
      });
    }

    const cleanNote = note && note.trim() ? note.trim() : (parsedDelta > 0 ? `Restock (+${parsedDelta})` : `Reduction (${parsedDelta})`);

    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare(`
        UPDATE products SET
          quantity_on_hand = ?,
          last_updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND organization_id = ?
      `).run(newQty, req.user.email, id, req.user.organizationId);

      db.prepare(`
        INSERT INTO stock_adjustments (
          organization_id, product_id, delta, quantity_before, quantity_after, note, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.organizationId, id, parsedDelta, currentQty, newQty, cleanNote, req.user.email);

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    res.json({
      message: `Stock successfully updated: ${currentQty} → ${newQty} (${parsedDelta > 0 ? '+' : ''}${parsedDelta})`,
      product: updatedProduct,
      adjustment: {
        delta: parsedDelta,
        quantityBefore: currentQty,
        quantityAfter: newQty,
        note: cleanNote
      }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// DELETE /api/products/:id - Delete product (FR-4)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?')
      .get(id, req.user.organizationId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.prepare('DELETE FROM products WHERE id = ? AND organization_id = ?').run(id, req.user.organizationId);

    res.json({
      message: `Product "${product.name}" (SKU: ${product.sku}) deleted successfully`,
      deletedId: Number(id)
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
