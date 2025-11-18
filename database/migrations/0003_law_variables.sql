-- ============================================================================
-- Legislative Variables (Admin-only management)
-- Migration: 0003_law_variables
-- Created: 2025-11-18
-- ============================================================================

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- Law Variable Types (справочник типов законодательных переменных)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS law_variable_types (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- 'excise_tax', 'import_duty', 'vat', 'eur_to_usd'
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('tax', 'duty', 'currency', 'fee')),
  description TEXT,
  unit TEXT NOT NULL, -- 'percent', 'eur_per_cm3', 'usd_flat', 'rate'
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_law_variable_types_code 
  ON law_variable_types(code);
CREATE INDEX IF NOT EXISTS idx_law_variable_types_category 
  ON law_variable_types(category, active);

-- --------------------------------------------------------------------------
-- Law Rates (законодательные ставки: акциз, пошлина, НДС)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS law_rates (
  id TEXT PRIMARY KEY,
  variable_type_id TEXT NOT NULL REFERENCES law_variable_types(id),
  rate_name TEXT NOT NULL,
  
  -- Условия применения
  fuel_type TEXT, -- 'gasoline', 'diesel', 'hybrid', 'plugin_hybrid', 'electric'
  volume_min INTEGER, -- см³ (для акциза)
  volume_max INTEGER, -- см³ (NULL = infinity)
  age_min INTEGER, -- возраст авто (для множителей)
  age_max INTEGER, -- NULL = infinity
  
  -- Значение ставки
  rate_value REAL NOT NULL,
  rate_unit TEXT NOT NULL, -- 'percent', 'eur_per_cm3', 'usd_flat', 'multiplier'
  
  -- Метаданные
  legal_reference TEXT, -- ссылка на закон
  description TEXT,
  
  -- Версионирование
  effective_from INTEGER NOT NULL, -- Unix timestamp
  effective_to INTEGER, -- NULL = active
  
  -- Audit
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Проверки
  CONSTRAINT chk_law_rates_dates 
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT chk_law_rates_volume 
    CHECK (volume_max IS NULL OR volume_max >= volume_min),
  CONSTRAINT chk_law_rates_age 
    CHECK (age_max IS NULL OR age_max >= age_min),
    
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_law_rates_variable_type 
  ON law_rates(variable_type_id);
CREATE INDEX IF NOT EXISTS idx_law_rates_fuel_type 
  ON law_rates(fuel_type);
CREATE INDEX IF NOT EXISTS idx_law_rates_effective 
  ON law_rates(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_law_rates_active 
  ON law_rates(effective_from, effective_to) 
  WHERE effective_to IS NULL;

-- --------------------------------------------------------------------------
-- Law Rates Versions (история изменений)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS law_rates_versions (
  id TEXT PRIMARY KEY,
  rate_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot TEXT NOT NULL, -- JSON полного состояния
  change_type TEXT NOT NULL CHECK(change_type IN ('create', 'update', 'deactivate')),
  change_reason TEXT,
  updated_by TEXT,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (rate_id) REFERENCES law_rates(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_law_rates_versions_rate 
  ON law_rates_versions(rate_id, version DESC);

-- --------------------------------------------------------------------------
-- Exchange Rates (курсы валют)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  variable_type_id TEXT NOT NULL REFERENCES law_variable_types(id),
  rate_name TEXT NOT NULL,
  rate_value REAL NOT NULL,
  rate_date INTEGER NOT NULL, -- Unix timestamp
  source TEXT, -- 'NBU', 'ECB', 'manual', etc.
  
  created_at INTEGER NOT NULL,
  
  UNIQUE(variable_type_id, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_variable_type 
  ON exchange_rates(variable_type_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
  ON exchange_rates(rate_date DESC);

-- --------------------------------------------------------------------------
-- Initial Law Variable Types
-- --------------------------------------------------------------------------
INSERT INTO law_variable_types (id, code, name, category, description, unit, created_at, updated_at)
VALUES 
  ('lvt-excise', 'excise_tax', 'Акцизный сбор', 'tax', 
   'Акцизный налог на импорт автомобилей (зависит от объема и возраста)', 
   'eur_per_cm3', strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lvt-import-duty', 'import_duty', 'Импортная пошлина', 'duty', 
   'Таможенная пошлина на импорт автомобилей', 
   'percent', strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lvt-vat', 'vat', 'НДС/ПДВ', 'tax', 
   'Налог на добавленную стоимость', 
   'percent', strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lvt-eur-usd', 'eur_to_usd', 'Курс EUR/USD', 'currency', 
   'Обменный курс евро к доллару США', 
   'rate', strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lvt-uah-usd', 'uah_to_usd', 'Курс UAH/USD', 'currency', 
   'Обменный курс гривны к доллару США', 
   'rate', strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lvt-customs-fee', 'customs_clearance', 'Таможенное оформление', 'fee', 
   'Базовый сбор за таможенное оформление', 
   'usd_flat', strftime('%s', 'now'), strftime('%s', 'now'));

-- --------------------------------------------------------------------------
-- Default Law Rates (актуальные ставки на 2025 год)
-- --------------------------------------------------------------------------

-- Акциз для бензиновых авто до 3.0L
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-excise-gas-3000', 'lvt-excise', 
  'Акциз бензин до 3000 см³', 'gasoline', 0, 3000,
  0.05, 'eur_per_cm3',
  'Податковий кодекс України, ст. 215',
  'Базовая ставка акциза для бензиновых автомобилей объемом до 3.0 литра',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Акциз для бензиновых авто от 3.0L
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-excise-gas-3000plus', 'lvt-excise',
  'Акциз бензин от 3001 см³', 'gasoline', 3001, NULL,
  0.10, 'eur_per_cm3',
  'Податковий кодекс України, ст. 215',
  'Повышенная ставка акциза для бензиновых автомобилей объемом свыше 3.0 литра',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Акциз для дизельных авто до 3.5L
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-excise-diesel-3500', 'lvt-excise',
  'Акциз дизель до 3500 см³', 'diesel', 0, 3500,
  0.075, 'eur_per_cm3',
  'Податковий кодекс України, ст. 215',
  'Базовая ставка акциза для дизельных автомобилей',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Акциз для дизельных авто от 3.5L
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-excise-diesel-3500plus', 'lvt-excise',
  'Акциз дизель от 3501 см³', 'diesel', 3501, NULL,
  0.15, 'eur_per_cm3',
  'Податковий кодекс України, ст. 215',
  'Повышенная ставка акциза для дизельных автомобилей большого объема',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Акциз для электромобилей (фиксированная ставка)
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-excise-electric', 'lvt-excise',
  'Акциз электромобиль', 'electric', NULL, NULL,
  100, 'usd_flat',
  'Податковий кодекс України, ст. 215',
  'Фиксированная ставка акциза для электромобилей',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Возрастные множители акциза
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, age_min, age_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES 
  ('lr-excise-mult-0-3', 'lvt-excise', 'Множитель 0-3 года', NULL, 0, 3,
   1.0, 'multiplier', 'Податковий кодекс України, ст. 215',
   'Базовый коэффициент для новых автомобилей',
   strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lr-excise-mult-4-5', 'lvt-excise', 'Множитель 4-5 лет', NULL, 4, 5,
   1.5, 'multiplier', 'Податковий кодекс України, ст. 215',
   'Повышающий коэффициент для автомобилей 4-5 лет',
   strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lr-excise-mult-6-8', 'lvt-excise', 'Множитель 6-8 лет', NULL, 6, 8,
   2.0, 'multiplier', 'Податковий кодекс України, ст. 215',
   'Повышающий коэффициент для автомобилей 6-8 лет',
   strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')),
   
  ('lr-excise-mult-9plus', 'lvt-excise', 'Множитель 9+ лет', NULL, 9, NULL,
   2.5, 'multiplier', 'Податковий кодекс України, ст. 215',
   'Максимальный коэффициент для старых автомобилей',
   strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now'));

-- Импортная пошлина
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-import-duty', 'lvt-import-duty',
  'Импортная пошлина', NULL, NULL, NULL,
  0.10, 'percent',
  'Митний кодекс України',
  'Базовая ставка импортной пошлины 10%',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- НДС/ПДВ
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-vat', 'lvt-vat',
  'НДС/ПДВ 20%', NULL, NULL, NULL,
  0.20, 'percent',
  'Податковий кодекс України',
  'Ставка налога на добавленную стоимость',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- Таможенное оформление (базовый сбор)
INSERT INTO law_rates (
  id, variable_type_id, rate_name, fuel_type, volume_min, volume_max,
  rate_value, rate_unit, legal_reference, description,
  effective_from, created_at, updated_at
)
VALUES (
  'lr-customs-base', 'lvt-customs-fee',
  'Таможенное оформление', NULL, NULL, NULL,
  150, 'usd_flat',
  'Митний кодекс України',
  'Базовый сбор за таможенное оформление',
  strftime('%s', '2024-01-01'), strftime('%s', 'now'), strftime('%s', 'now')
);

-- --------------------------------------------------------------------------
-- Default Exchange Rates
-- --------------------------------------------------------------------------
INSERT INTO exchange_rates (id, variable_type_id, rate_name, rate_value, rate_date, source, created_at)
VALUES 
  ('er-eur-usd-' || strftime('%s', 'now'), 'lvt-eur-usd', 
   'EUR to USD', 1.08, strftime('%s', 'now'), 'ECB', strftime('%s', 'now')),
   
  ('er-uah-usd-' || strftime('%s', 'now'), 'lvt-uah-usd',
   'UAH to USD', 0.027, strftime('%s', 'now'), 'NBU', strftime('%s', 'now'));


