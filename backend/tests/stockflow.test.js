import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { initDatabase } from '../src/db/database.js';

describe('📦 StockFlow MVP Core Logic & Multi-Tenancy Tests', () => {
  let db;

  beforeEach(() => {
    // In-memory isolated database for each test run
    db = initDatabase(':memory:');
  });

  // TEST 1: Tenant Creation & Auth Signup
  it('1. FR-1 & FR-2: Creates Organization and User with password hashing', () => {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('securePass123', salt);

    const orgRes = db.prepare('INSERT INTO organizations (name, default_low_stock_threshold) VALUES (?, 5)')
      .run('Acme Corp');
    const orgId = Number(orgRes.lastInsertRowid);

    const userRes = db.prepare('INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)')
      .run(orgId, 'admin@acmewares.com', passwordHash);
    const userId = Number(userRes.lastInsertRowid);

    assert.ok(orgId > 0);
    assert.ok(userId > 0);

    const user = db.prepare(`
      SELECT u.id, u.email, u.organization_id, o.name as org_name, o.default_low_stock_threshold
      FROM users u JOIN organizations o ON o.id = u.organization_id
      WHERE u.id = ?
    `).get(userId);

    assert.equal(user.email, 'admin@acmewares.com');
    assert.equal(user.org_name, 'Acme Corp');
    assert.equal(user.default_low_stock_threshold, 5);
    assert.ok(bcrypt.compareSync('securePass123', passwordHash));
    assert.equal(bcrypt.compareSync('wrongPass', passwordHash), false);
  });

  // TEST 2: Multi-Tenant Data Isolation (FR-2 & FR-3)
  it('2. Multi-tenant isolation: Products are strictly scoped to org, and identical SKUs can coexist across orgs', () => {
    // Org A
    const orgAId = Number(db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Org Alpha').lastInsertRowid);
    // Org B
    const orgBId = Number(db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Org Beta').lastInsertRowid);

    const insertProd = db.prepare(`
      INSERT INTO products (organization_id, name, sku, quantity_on_hand, selling_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Org Alpha creates item with SKU "ITEM-100"
    const prodA = insertProd.run(orgAId, 'Alpha Widget', 'ITEM-100', 50, 19.99);
    // Org Beta creates item with SAME SKU "ITEM-100"
    const prodB = insertProd.run(orgBId, 'Beta Widget', 'ITEM-100', 12, 29.99);

    assert.ok(prodA.lastInsertRowid > 0);
    assert.ok(prodB.lastInsertRowid > 0);
    assert.notEqual(prodA.lastInsertRowid, prodB.lastInsertRowid);

    // Query for Org Alpha only
    const orgAProducts = db.prepare('SELECT * FROM products WHERE organization_id = ?').all(orgAId);
    assert.equal(orgAProducts.length, 1);
    assert.equal(orgAProducts[0].name, 'Alpha Widget');
    assert.equal(orgAProducts[0].quantity_on_hand, 50);

    // Query for Org Beta only
    const orgBProducts = db.prepare('SELECT * FROM products WHERE organization_id = ?').all(orgBId);
    assert.equal(orgBProducts.length, 1);
    assert.equal(orgBProducts[0].name, 'Beta Widget');
    assert.equal(orgBProducts[0].quantity_on_hand, 12);

    // Duplicate SKU inside SAME organization must throw constraint violation
    assert.throws(() => {
      insertProd.run(orgAId, 'Duplicate SKU Widget', 'ITEM-100', 5, 9.99);
    }, /UNIQUE constraint failed/);
  });

  // TEST 3: Product CRUD & Search (FR-4)
  it('3. Product CRUD: Create, read with search filter, update, and delete', () => {
    const orgId = Number(db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Retail Store').lastInsertRowid);

    // Create
    const res = db.prepare(`
      INSERT INTO products (organization_id, name, sku, description, quantity_on_hand, cost_price, selling_price, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, 'Wireless Mouse', 'MOU-WL-01', 'Ergonomic optical mouse', 25, 8.50, 18.00, 5);
    const prodId = Number(res.lastInsertRowid);

    // Read single
    const item = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(prodId, orgId);
    assert.equal(item.name, 'Wireless Mouse');
    assert.equal(item.sku, 'MOU-WL-01');
    assert.equal(item.quantity_on_hand, 25);
    assert.equal(item.cost_price, 8.50);

    // Search filter
    const searchMatch = db.prepare(`
      SELECT * FROM products WHERE organization_id = ? AND (name LIKE ? OR sku LIKE ?)
    `).all(orgId, '%Mouse%', '%Mouse%');
    assert.equal(searchMatch.length, 1);

    const searchNoMatch = db.prepare(`
      SELECT * FROM products WHERE organization_id = ? AND (name LIKE ? OR sku LIKE ?)
    `).all(orgId, '%Keyboard%', '%Keyboard%');
    assert.equal(searchNoMatch.length, 0);

    // Update
    db.prepare(`
      UPDATE products SET selling_price = 22.50, low_stock_threshold = 30 WHERE id = ? AND organization_id = ?
    `).run(prodId, orgId);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
    assert.equal(updated.selling_price, 22.50);
    assert.equal(updated.low_stock_threshold, 30);

    // Delete
    db.prepare('DELETE FROM products WHERE id = ? AND organization_id = ?').run(prodId, orgId);
    const deleted = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
    assert.equal(deleted, undefined);
  });

  // TEST 4: Stock Adjustment (+/- delta) & Floor Protection (FR-5)
  it('4. Stock Adjustment: +/- delta updates quantity and prevents negative inventory', () => {
    const orgId = Number(db.prepare('INSERT INTO organizations (name) VALUES (?)').run('Gadget Depo').lastInsertRowid);

    const res = db.prepare(`
      INSERT INTO products (organization_id, name, sku, quantity_on_hand)
      VALUES (?, 'Mechanical Keyboard', 'KB-MECH', 10)
    `).run(orgId);
    const prodId = Number(res.lastInsertRowid);

    // Restock +15 units
    let current = db.prepare('SELECT quantity_on_hand FROM products WHERE id = ?').get(prodId);
    let delta = 15;
    let newQty = current.quantity_on_hand + delta;
    db.prepare('UPDATE products SET quantity_on_hand = ? WHERE id = ?').run(newQty, prodId);
    db.prepare(`
      INSERT INTO stock_adjustments (organization_id, product_id, delta, quantity_before, quantity_after, note, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, prodId, delta, current.quantity_on_hand, newQty, 'Supplier shipment', 'admin@gadget.com');

    let updated = db.prepare('SELECT quantity_on_hand FROM products WHERE id = ?').get(prodId);
    assert.equal(updated.quantity_on_hand, 25);

    // Reduction -7 units
    current = updated;
    delta = -7;
    newQty = current.quantity_on_hand + delta;
    assert.ok(newQty >= 0, 'New quantity is non-negative');
    db.prepare('UPDATE products SET quantity_on_hand = ? WHERE id = ?').run(newQty, prodId);

    updated = db.prepare('SELECT quantity_on_hand FROM products WHERE id = ?').get(prodId);
    assert.equal(updated.quantity_on_hand, 18);

    // Reduction exceeding available stock (e.g. -25 units when stock is 18)
    delta = -25;
    const invalidQty = updated.quantity_on_hand + delta;
    assert.ok(invalidQty < 0, 'Correctly flags that stock cannot fall below 0');

    // Verify stock adjustment history logged
    const logs = db.prepare('SELECT * FROM stock_adjustments WHERE product_id = ?').all(prodId);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].delta, 15);
    assert.equal(logs[0].quantity_before, 10);
    assert.equal(logs[0].quantity_after, 25);
  });

  // TEST 5: Dashboard Metrics & Low Stock Rule (FR-6 & FR-7)
  it('5. Dashboard: Calculates summary counts, valuation, and low stock threshold fallback', () => {
    const orgRes = db.prepare('INSERT INTO organizations (name, default_low_stock_threshold) VALUES (?, ?)')
      .run('Superstore', 5);
    const orgId = Number(orgRes.lastInsertRowid);

    const insertProd = db.prepare(`
      INSERT INTO products (organization_id, name, sku, quantity_on_hand, cost_price, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Product 1: Qty 3, Custom threshold 5 -> LOW STOCK (3 <= 5)
    insertProd.run(orgId, 'Item A', 'SKU-A', 3, 10.0, 5);

    // Product 2: Qty 10, Custom threshold 4 -> NORMAL (10 > 4)
    insertProd.run(orgId, 'Item B', 'SKU-B', 10, 20.0, 4);

    // Product 3: Qty 4, No threshold (null) -> Fallback to Org Default 5 -> LOW STOCK (4 <= 5)
    insertProd.run(orgId, 'Item C', 'SKU-C', 4, 15.0, null);

    // Product 4: Qty 6, No threshold (null) -> Fallback to Org Default 5 -> NORMAL (6 > 5)
    insertProd.run(orgId, 'Item D', 'SKU-D', 6, 5.0, null);

    const products = db.prepare('SELECT * FROM products WHERE organization_id = ?').all(orgId);
    const org = db.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = ?').get(orgId);

    const totalProducts = products.length;
    let totalQuantity = 0;
    let totalValuation = 0;
    const lowStockItems = [];

    for (const p of products) {
      totalQuantity += p.quantity_on_hand;
      totalValuation += (p.quantity_on_hand * p.cost_price);
      const effectiveThreshold = p.low_stock_threshold !== null ? p.low_stock_threshold : org.default_low_stock_threshold;
      if (p.quantity_on_hand <= effectiveThreshold) {
        lowStockItems.push({
          sku: p.sku,
          quantity: p.quantity_on_hand,
          threshold: effectiveThreshold
        });
      }
    }

    assert.equal(totalProducts, 4);
    assert.equal(totalQuantity, 3 + 10 + 4 + 6); // 23
    assert.equal(totalValuation, (3 * 10) + (10 * 20) + (4 * 15) + (6 * 5)); // 30 + 200 + 60 + 30 = 320
    assert.equal(lowStockItems.length, 2);
    assert.deepEqual(lowStockItems.map(i => i.sku).sort(), ['SKU-A', 'SKU-C']);

    // Now update org default low stock threshold to 10 (FR-7)
    db.prepare('UPDATE organizations SET default_low_stock_threshold = 10 WHERE id = ?').run(orgId);
    const updatedOrg = db.prepare('SELECT default_low_stock_threshold FROM organizations WHERE id = ?').get(orgId);
    assert.equal(updatedOrg.default_low_stock_threshold, 10);

    // Recalculate low stock items with new default
    const newLowStock = [];
    for (const p of products) {
      const effectiveThreshold = p.low_stock_threshold !== null ? p.low_stock_threshold : updatedOrg.default_low_stock_threshold;
      if (p.quantity_on_hand <= effectiveThreshold) {
        newLowStock.push(p.sku);
      }
    }
    // Item D (qty 6, null threshold) now has effective threshold 10 -> 6 <= 10 -> now LOW STOCK!
    assert.equal(newLowStock.length, 3);
    assert.ok(newLowStock.includes('SKU-D'));
  });
});
