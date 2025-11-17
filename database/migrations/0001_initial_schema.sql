-- BOCalc Database Schema - Initial Migration
-- Cloudflare D1 (SQLite)
-- Created: 2025-11-17

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'vendor', 'viewer')),
  vendor_id TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_vendor_id ON users(vendor_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- Vendors Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  logo_url TEXT,
  active INTEGER DEFAULT 1,
  settings TEXT NOT NULL, -- JSON: VendorSettings
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_vendors_slug ON vendors(slug);
CREATE INDEX idx_vendors_active ON vendors(active);

-- ============================================================================
-- Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  vendor_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  changes_before TEXT, -- JSON
  changes_after TEXT, -- JSON
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_vendor_id ON audit_logs(vendor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- Google Sheets Cache Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sheets_cache (
  id TEXT PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON array
  version INTEGER NOT NULL DEFAULT 1,
  synced_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sheets_cache_sheet_name ON sheets_cache(sheet_name);
CREATE INDEX idx_sheets_cache_expires_at ON sheets_cache(expires_at);

-- ============================================================================
-- Calculations Table (Saved calculations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  vendor_id TEXT NOT NULL,
  input_data TEXT NOT NULL, -- JSON: CalculatorInput
  result_data TEXT NOT NULL, -- JSON: CalculationResult
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  valid_until INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX idx_calculations_user_id ON calculations(user_id);
CREATE INDEX idx_calculations_vendor_id ON calculations(vendor_id);
CREATE INDEX idx_calculations_created_at ON calculations(created_at DESC);
CREATE INDEX idx_calculations_valid_until ON calculations(valid_until);

-- ============================================================================
-- Refresh Tokens Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================================
-- Password Reset Tokens Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- Sync History Table (Google Sheets sync tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_history (
  id TEXT PRIMARY KEY,
  sheet_name TEXT NOT NULL,
  sync_type TEXT NOT NULL CHECK(sync_type IN ('auto', 'manual')),
  triggered_by TEXT, -- user_id for manual syncs
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL CHECK(status IN ('running', 'success', 'failed')),
  rows_synced INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_sync_history_sheet_name ON sync_history(sheet_name);
CREATE INDEX idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX idx_sync_history_status ON sync_history(status);

-- ============================================================================
-- Initial Data - Create default admin user
-- Password: Admin123! (change this after first login)
-- ============================================================================
INSERT INTO vendors (id, name, slug, contact_email, active, settings, created_at, updated_at)
VALUES (
  'default-vendor',
  'Default Vendor',
  'default',
  'zaaatakyrylo@gmail.com',
  1,
  '{"defaultCurrency":"USD","defaultLanguage":"ru","showBranding":true,"emailNotifications":true,"allowPublicCalculator":true}',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

INSERT INTO users (id, email, password_hash, role, vendor_id, active, created_at, updated_at)
VALUES (
  'admin-001',
  'zaaatakyrylo@gmail.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYbYr8W8xKW', -- Admin123!
  'admin',
  NULL,
  1,
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- ============================================================================
-- Views for convenience
-- ============================================================================

-- View: Recent audit logs with user and vendor info
CREATE VIEW IF NOT EXISTS v_recent_audit_logs AS
SELECT 
  al.*,
  u.email as user_email,
  v.name as vendor_name
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN vendors v ON al.vendor_id = v.id
ORDER BY al.timestamp DESC;

-- View: Active users with vendor info
CREATE VIEW IF NOT EXISTS v_active_users AS
SELECT 
  u.id,
  u.email,
  u.role,
  u.vendor_id,
  v.name as vendor_name,
  v.slug as vendor_slug,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN vendors v ON u.vendor_id = v.id
WHERE u.active = 1;

-- View: Calculation statistics by vendor
CREATE VIEW IF NOT EXISTS v_calculation_stats AS
SELECT 
  vendor_id,
  COUNT(*) as total_calculations,
  AVG(total_amount) as avg_amount,
  MIN(total_amount) as min_amount,
  MAX(total_amount) as max_amount,
  SUM(total_amount) as sum_amount,
  DATE(created_at, 'unixepoch') as calculation_date
FROM calculations
GROUP BY vendor_id, DATE(created_at, 'unixepoch');


