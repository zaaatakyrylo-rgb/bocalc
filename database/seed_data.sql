-- ============================================================================
-- Seed Data for BOCalc
-- ============================================================================

-- Insert Vendor Rates
INSERT INTO vendor_rates (id, vendor_id, rate_type, min_value, max_value, fixed_amount, percentage, unit_price, currency, effective_at, expires_at, active, created_at, updated_at, updated_by) VALUES
-- Auction Fees
('rate-auction-1', 'default-vendor', 'auction_fee', 0, 1000, NULL, 10, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-auction-2', 'default-vendor', 'auction_fee', 1001, 5000, NULL, 8, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-auction-3', 'default-vendor', 'auction_fee', 5001, 999999, NULL, 5, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- USA Shipping Base Rates
('rate-usa-base-1', 'default-vendor', 'usa_shipping_base', NULL, NULL, 100, NULL, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-usa-per-mile', 'default-vendor', 'usa_shipping_per_mile', NULL, NULL, NULL, NULL, 2.5, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Ocean Shipping Base Rates
('rate-ocean-base-1', 'default-vendor', 'ocean_shipping_base', NULL, NULL, 1200, NULL, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Documentation Fees
('rate-doc-fee', 'default-vendor', 'documentation_fee', NULL, NULL, 150, NULL, NULL, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Storage Fees
('rate-storage-day', 'default-vendor', 'storage_per_day', NULL, NULL, NULL, NULL, 5, 'USD', strftime('%s', 'now'), NULL, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001');

-- Insert Vendor Ports
INSERT INTO vendor_ports (id, vendor_id, name, country, city, base_ocean_shipping, inland_shipping, transit_time_days, active, created_at, updated_at, updated_by) VALUES
-- USA Ports
('port-newark', 'default-vendor', 'Port Newark', 'USA', 'Newark, NJ', 1200, 100, 25, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-savannah', 'default-vendor', 'Port of Savannah', 'USA', 'Savannah, GA', 1100, 150, 28, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-houston', 'default-vendor', 'Port of Houston', 'USA', 'Houston, TX', 1300, 200, 30, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-losangeles', 'default-vendor', 'Port of Los Angeles', 'USA', 'Los Angeles, CA', 1400, 250, 22, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-seattle', 'default-vendor', 'Port of Seattle', 'USA', 'Seattle, WA', 1500, 300, 20, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Destination Ports
('port-odessa', 'default-vendor', 'Port of Odessa', 'Ukraine', 'Odessa', 0, 0, 25, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-poti', 'default-vendor', 'Port of Poti', 'Georgia', 'Poti', 0, 50, 28, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-constanta', 'default-vendor', 'Port of Constanta', 'Romania', 'Constanta', 0, 100, 30, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001');

-- Insert Vendor Modifiers
INSERT INTO vendor_modifiers (id, vendor_id, modifier_type, modifier_key, ocean_shipping_modifier, usa_shipping_modifier, fixed_amount, percentage, active, created_at, updated_at, updated_by) VALUES
-- Body Type Modifiers
('mod-sedan', 'default-vendor', 'body_type', 'Sedan', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-suv', 'default-vendor', 'body_type', 'SUV', 100, 50, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-bigsuv', 'default-vendor', 'body_type', 'Big SUV', 200, 100, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-pickup', 'default-vendor', 'body_type', 'Pickup', 150, 75, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-coupe', 'default-vendor', 'body_type', 'Coupe', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Running Status Modifiers
('mod-running', 'default-vendor', 'running_status', 'Running', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-not-running', 'default-vendor', 'running_status', 'Not Running', 100, 150, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Damage Type Modifiers
('mod-no-damage', 'default-vendor', 'damage_type', 'No Damage', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-minor-damage', 'default-vendor', 'damage_type', 'Minor Damage', 50, 25, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-front-damage', 'default-vendor', 'damage_type', 'Front Damage', 100, 50, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-rear-damage', 'default-vendor', 'damage_type', 'Rear Damage', 100, 50, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-side-damage', 'default-vendor', 'damage_type', 'Side Damage', 75, 40, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-total-loss', 'default-vendor', 'damage_type', 'Total Loss', 200, 100, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Car Age Modifiers
('mod-new-car', 'default-vendor', 'car_age', '0-3 years', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-mid-car', 'default-vendor', 'car_age', '4-7 years', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-old-car', 'default-vendor', 'car_age', '8+ years', 50, 25, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Auction Location Modifiers (based on distance from port)
('mod-loc-nj', 'default-vendor', 'auction_location', 'New Jersey', 0, 0, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-loc-ga', 'default-vendor', 'auction_location', 'Georgia', 0, 100, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-loc-tx', 'default-vendor', 'auction_location', 'Texas', 0, 200, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('mod-loc-ca', 'default-vendor', 'auction_location', 'California', 0, 300, 0, 0, 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001');

