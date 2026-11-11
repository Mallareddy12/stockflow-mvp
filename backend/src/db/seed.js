import bcrypt from 'bcryptjs';
import { initDatabase } from './database.js';

export function runSeed(dbInstance = null) {
  const db = dbInstance || initDatabase();

  console.log('🌱 Seeding StockFlow MVP database...');

  // Clean existing data
  db.exec(`
    DELETE FROM stock_adjustments;
    DELETE FROM products;
    DELETE FROM users;
    DELETE FROM organizations;
  `);

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  // 1. Organization 1: Acme Supplies Ltd
  const org1Res = db.prepare(`
    INSERT INTO organizations (name, default_low_stock_threshold)
    VALUES (?, ?)
  `).run('Acme Supplies Ltd', 5);
  const org1Id = Number(org1Res.lastInsertRowid);

  db.prepare(`
    INSERT INTO users (organization_id, email, password_hash)
    VALUES (?, ?, ?)
  `).run(org1Id, 'owner@acme.com', passwordHash);

  const insertProduct = db.prepare(`
    INSERT INTO products (
      organization_id, name, sku, description, quantity_on_hand,
      cost_price, selling_price, low_stock_threshold, last_updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAdj = db.prepare(`
    INSERT INTO stock_adjustments (
      organization_id, product_id, delta, quantity_before, quantity_after, note, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const p1 = insertProduct.run(
    org1Id,
    'Wireless Ergonomic Keyboard',
    'KB-WL-01',
    'Split ergonomic design with quiet tactile switches and wrist rest',
    3,
    45.00,
    79.99,
    5,
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p1.lastInsertRowid), 3, 0, 3, 'Initial inventory count', 'owner@acme.com');

  const p2 = insertProduct.run(
    org1Id,
    'USB-C Dual Display Docking Station',
    'DOCK-4K-02',
    '100W Power Delivery, dual HDMI 4K@60Hz, Gigabit Ethernet',
    18,
    85.00,
    149.00,
    4,
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p2.lastInsertRowid), 18, 0, 18, 'Initial inventory count', 'owner@acme.com');

  const p3 = insertProduct.run(
    org1Id,
    'Ultra-Clear 4K Pro Webcam',
    'CAM-PRO-4K',
    'Autofocus AI tracking with dual beamforming microphones',
    2,
    55.00,
    99.50,
    5,
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p3.lastInsertRowid), 2, 0, 2, 'Initial inventory count', 'owner@acme.com');

  const p4 = insertProduct.run(
    org1Id,
    'Ergonomic Mesh Office Chair',
    'CHR-MESH-PRO',
    'High-back breathable mesh with 3D adjustable armrests and lumbar support',
    8,
    140.00,
    249.00,
    3,
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p4.lastInsertRowid), 8, 0, 8, 'Initial inventory count', 'owner@acme.com');

  const p5 = insertProduct.run(
    org1Id,
    'Active Noise Cancelling Bluetooth Headset',
    'AUD-ANC-08',
    'Over-ear premium wireless headphones with 40h battery life',
    1,
    70.00,
    129.99,
    null, // tests fallback to org default threshold of 5 (1 <= 5 -> LOW STOCK!)
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p5.lastInsertRowid), 1, 0, 1, 'Initial inventory count', 'owner@acme.com');

  const p6 = insertProduct.run(
    org1Id,
    'Heavy-Duty Aluminum Laptop Stand',
    'STND-AL-01',
    'Foldable riser compatible with laptops 10 to 17 inches',
    35,
    16.50,
    32.00,
    null, // tests fallback to org default threshold of 5 (35 > 5 -> NORMAL)
    'owner@acme.com'
  );
  insertAdj.run(org1Id, Number(p6.lastInsertRowid), 35, 0, 35, 'Initial inventory count', 'owner@acme.com');

  // 2. Organization 2: Northstar Retailers (Different tenant with separate products, test SKU isolation)
  const org2Res = db.prepare(`
    INSERT INTO organizations (name, default_low_stock_threshold)
    VALUES (?, ?)
  `).run('Northstar Retailers', 10);
  const org2Id = Number(org2Res.lastInsertRowid);

  db.prepare(`
    INSERT INTO users (organization_id, email, password_hash)
    VALUES (?, ?, ?)
  `).run(org2Id, 'demo@northstar.io', passwordHash);

  // Same SKU as Acme Supplies to prove multi-tenant isolation!
  const p7 = insertProduct.run(
    org2Id,
    'Northstar Wireless Ergonomic Keyboard',
    'KB-WL-01',
    'Northstar branded custom keyboard',
    42,
    40.00,
    69.99,
    10,
    'demo@northstar.io'
  );
  insertAdj.run(org2Id, Number(p7.lastInsertRowid), 42, 0, 42, 'Initial warehouse transfer', 'demo@northstar.io');

  const p8 = insertProduct.run(
    org2Id,
    'Precision Gaming Mouse RGB',
    'MSE-RGB-90',
    '16,000 DPI sensor, ultra-lightweight honeycomb shell',
    6,
    22.00,
    49.99,
    null, // Fallback to org default 10 -> 6 <= 10 -> LOW STOCK!
    'demo@northstar.io'
  );
  insertAdj.run(org2Id, Number(p8.lastInsertRowid), 6, 0, 6, 'Initial warehouse transfer', 'demo@northstar.io');

  console.log('✅ Seed completed successfully:');
  console.log('   Org 1: Acme Supplies Ltd (User: owner@acme.com / password123)');
  console.log('   Org 2: Northstar Retailers (User: demo@northstar.io / password123)');
}

if (process.argv[1].endsWith('seed.js')) {
  runSeed();
}
