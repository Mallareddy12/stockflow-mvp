# StockFlow MVP (v0.1) — SaaS Inventory Management System

A multi-tenant SaaS inventory management web application built strictly to the **6-Hour MVP PRD specifications**.

---

## 🌟 Overview & Key Capabilities

- **Organization Scoping & Multi-Tenancy (FR-1, FR-2)**:
  - Users sign up with an **Email**, **Password**, and **Organization Name** (e.g. *Acme Supplies Ltd* or *Northstar Retailers*).
  - Every product, inventory record, and stock adjustment is strictly scoped to the tenant's `organization_id`.
  - Same SKUs (e.g., `KB-WL-01`) can seamlessly exist across different organizations without data leaks or collision, but are strictly enforced unique within each organization.
- **Product & Inventory Management (FR-3, FR-4)**:
  - Full CRUD for products: Name, SKU, Quantity on Hand, Cost Price, Selling Price, Low Stock Threshold, and Description.
  - Interactive table with real-time search by Product Name or SKU.
  - Hard delete with safety confirmation dialog before deletion.
- **Simple Stock Adjustments (FR-5)**:
  - Direct form updates or quick modal adjustments (+/- $N$ units with optional audit notes).
  - Built-in inventory floor protection prevents stock levels from dropping below zero.
  - Logs timestamps and `last_updated_by` for inventory tracking.
- **Dashboard Overview (FR-6)**:
  - Summary cards: Total Products, Units on Hand, Inventory Valuation, and Low Stock Alerts.
  - Dedicated "Low stock items requiring restock" section identifying items where $\text{Quantity on Hand} \le \text{Low Stock Threshold}$.
  - Dynamic fallback to the Organization's default threshold whenever an individual product threshold is not defined.
  - Quick action buttons to immediately restock low-stock products from the dashboard.
- **Global Settings (FR-7)**:
  - Configurable Default Low Stock Threshold (default: 5 units).
  - Live organization name editing.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, Lucide Icons | Blazing fast SPA, reactive state, responsive desktop-first UI |
| **Backend** | Node.js (ES Modules), Express.js | Robust RESTful API architecture |
| **Database** | Native `node:sqlite` (`DatabaseSync` - Node 25) | Zero-dependency, ultra-fast embedded SQLite with WAL mode & foreign keys enabled |
| **Auth & Security** | JWT (JSON Web Tokens), `bcryptjs` (salt rounds: 10) | Stateless secure multi-tenant authentication with token expiry |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert/strict`) | Built-in zero-dependency unit and integration test suite |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v25+)
- npm or pnpm

### 1. Setup & Database Seeding
From the project root:
```bash
# Seed database with sample organizations and products
npm run seed
```

### 2. Run the Application
In development, run the backend and frontend simultaneously:
```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend SPA (runs on http://localhost:3000)
npm run dev:frontend
```

Or run the production single-port server:
```bash
npm run build
npm start
# Open http://localhost:5000 in your browser!
```

---

## 🔑 Pre-Seeded Demo Accounts

The database comes pre-populated with two distinct organization tenants for testing and evaluation:

| Tenant Organization | User Email | Password | Pre-configured Data |
|---|---|---|---|
| **Acme Supplies Ltd** | `owner@acme.com` | `password123` | 6 products, default threshold: 5, multiple low-stock items |
| **Northstar Retailers** | `demo@northstar.io` | `password123` | 2 products, default threshold: 10, tests cross-tenant SKU isolation |

*Tip: The login page includes 1-click quick fill buttons for both test accounts!*

---

## 🧪 Automated Test Suite

Run the automated test suite verifying multi-tenancy, auth, product CRUD, negative stock guards, and low-stock calculations:
```bash
npm test
```

### Test Coverage Highlights:
- Tenant signup and password hashing with `bcryptjs`.
- Cross-tenant data isolation and same-SKU coexistence.
- SKU collision rejection within the same organization.
- Product CRUD and search query filtering.
- Stock adjustments (+/- delta) and negative quantity floor validation.
- Dashboard metric computations and global low-stock fallback logic.

---

## 🌐 Server Deployment Instructions

### Option 1: Render / Railway / Koyeb (Single Web Service)
1. Push repository to GitHub or GitLab.
2. Create a new **Web Service** on [Render](https://render.com) or [Railway](https://railway.app).
3. Set the build and start commands:
   - **Build Command**: `cd frontend && npm install && npm run build && cd ../backend && npm install && node src/db/seed.js`
   - **Start Command**: `cd backend && node src/index.js`
4. Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=your-random-production-secret-key`
5. The backend automatically serves the compiled frontend from `frontend/dist`.

### Option 2: Vercel / Netlify
1. Connect GitHub repo.
2. Framework preset: **Vite**.
3. Deploy frontend on Vercel and backend API on Render/Railway.
