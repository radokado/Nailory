-- Nailory D1 Database Schema
-- Multi-tenant Cloudflare D1 (SQLite) Schema

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_gels (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  code_or_name TEXT NOT NULL,
  color_hex TEXT,
  category TEXT,
  photo_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  photo_key TEXT NOT NULL,
  style_tags JSON,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS visit_gels (
  visit_id TEXT NOT NULL,
  gel_id TEXT NOT NULL,
  PRIMARY KEY (visit_id, gel_id),
  FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  FOREIGN KEY (gel_id) REFERENCES inventory_gels(id) ON DELETE CASCADE
);
