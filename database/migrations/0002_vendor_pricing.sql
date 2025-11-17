-- ============================================================================
-- Vendor pricing & versioning schema
-- ============================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- Vendor versions (history snapshots)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_versions (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL, -- JSON payload of vendor row
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate', 'reactivate')),
  change_notes TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_versions_vendor
  ON vendor_versions (vendor_id, version DESC);

-- --------------------------------------------------------------------------
-- Vendor Rates (auction/service/base rates)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_rates (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  rate_type TEXT NOT NULL, -- e.g. auction_fee, service_fee
  name TEXT NOT NULL,
  description TEXT,
  base_value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  effective_at INTEGER NOT NULL,
  metadata TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_rates_vendor
  ON vendor_rates (vendor_id, rate_type, active);

CREATE TABLE IF NOT EXISTS vendor_rates_versions (
  id TEXT PRIMARY KEY,
  rate_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate', 'reactivate')),
  change_notes TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (rate_id) REFERENCES vendor_rates(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_rates_versions_rate
  ON vendor_rates_versions (rate_id, version DESC);

-- --------------------------------------------------------------------------
-- Vendor Ports (destination specific pricing)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_ports (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  base_ocean_shipping REAL NOT NULL DEFAULT 0,
  inland_shipping REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  transit_time_days INTEGER,
  metadata TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_ports_vendor
  ON vendor_ports (vendor_id, active);

CREATE TABLE IF NOT EXISTS vendor_ports_versions (
  id TEXT PRIMARY KEY,
  port_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate', 'reactivate')),
  change_notes TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (port_id) REFERENCES vendor_ports(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_ports_versions_port
  ON vendor_ports_versions (port_id, version DESC);

-- --------------------------------------------------------------------------
-- Vendor Modifiers (body type/damage/weight adjustments)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_modifiers (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  modifier_type TEXT NOT NULL, -- e.g. body_type, damage_type
  target TEXT NOT NULL, -- sedan/suv/... or custom key
  ocean_modifier REAL NOT NULL DEFAULT 0,
  usa_modifier REAL NOT NULL DEFAULT 0,
  notes TEXT,
  metadata TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_modifiers_vendor
  ON vendor_modifiers (vendor_id, modifier_type, active);

CREATE TABLE IF NOT EXISTS vendor_modifiers_versions (
  id TEXT PRIMARY KEY,
  modifier_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate', 'reactivate')),
  change_notes TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (modifier_id) REFERENCES vendor_modifiers(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendor_modifiers_versions_modifier
  ON vendor_modifiers_versions (modifier_id, version DESC);

-- --------------------------------------------------------------------------
-- User versions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_versions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate', 'reactivate')),
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_versions_user
  ON user_versions (user_id, version DESC);

-- --------------------------------------------------------------------------
-- Calculation versions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calculation_versions (
  id TEXT PRIMARY KEY,
  calculation_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'archive')),
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (calculation_id) REFERENCES calculations(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calculation_versions_calc
  ON calculation_versions (calculation_id, version DESC);

-- Add updated_at column to calculations for version tracking
ALTER TABLE calculations ADD COLUMN updated_at INTEGER;
UPDATE calculations SET updated_at = created_at WHERE updated_at IS NULL;



