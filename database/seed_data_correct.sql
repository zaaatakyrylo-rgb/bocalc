-- ============================================================================
-- Seed Data for BOCalc (Correct Schema)
-- ============================================================================

-- Insert Vendor Rates
INSERT INTO vendor_rates (id, vendor_id, rate_type, name, description, base_value, currency, effective_at, metadata, active, created_at, updated_at, updated_by) VALUES
-- Auction Fees
('rate-auction-low', 'default-vendor', 'auction_fee', 'Auction Fee (0-1000)', 'Auction fee for cars $0-$1000', 10, 'USD', strftime('%s', 'now'), '{"type":"percentage","range":{"min":0,"max":1000}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-auction-mid', 'default-vendor', 'auction_fee', 'Auction Fee (1001-5000)', 'Auction fee for cars $1001-$5000', 8, 'USD', strftime('%s', 'now'), '{"type":"percentage","range":{"min":1001,"max":5000}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-auction-high', 'default-vendor', 'auction_fee', 'Auction Fee (5000+)', 'Auction fee for cars $5000+', 5, 'USD', strftime('%s', 'now'), '{"type":"percentage","range":{"min":5001,"max":999999}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- USA Shipping
('rate-usa-base', 'default-vendor', 'usa_shipping', 'USA Shipping Base', 'Base USA shipping fee', 100, 'USD', strftime('%s', 'now'), '{"type":"fixed"}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('rate-usa-mile', 'default-vendor', 'usa_shipping', 'USA Shipping Per Mile', 'Per mile shipping cost', 2.5, 'USD', strftime('%s', 'now'), '{"type":"per_unit","unit":"mile"}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Ocean Shipping
('rate-ocean-base', 'default-vendor', 'ocean_shipping', 'Ocean Shipping Base', 'Base ocean shipping cost', 1200, 'USD', strftime('%s', 'now'), '{"type":"fixed"}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Documentation
('rate-doc', 'default-vendor', 'documentation', 'Documentation Fee', 'Document processing fee', 150, 'USD', strftime('%s', 'now'), '{"type":"fixed"}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Storage
('rate-storage', 'default-vendor', 'storage', 'Storage Per Day', 'Daily storage fee', 5, 'USD', strftime('%s', 'now'), '{"type":"per_unit","unit":"day"}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001');

-- Insert Vendor Ports
INSERT INTO vendor_ports (id, vendor_id, name, country, city, base_cost, metadata, active, created_at, updated_at, updated_by) VALUES
-- USA Ports
('port-newark', 'default-vendor', 'Port Newark', 'USA', 'Newark, NJ', 1200, '{"inland_shipping":100,"transit_days":25,"coordinates":{"lat":40.6895,"lng":-74.1745}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-savannah', 'default-vendor', 'Port of Savannah', 'USA', 'Savannah, GA', 1100, '{"inland_shipping":150,"transit_days":28,"coordinates":{"lat":32.0809,"lng":-81.0912}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-houston', 'default-vendor', 'Port of Houston', 'USA', 'Houston, TX', 1300, '{"inland_shipping":200,"transit_days":30,"coordinates":{"lat":29.7604,"lng":-95.3698}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-losangeles', 'default-vendor', 'Port of Los Angeles', 'USA', 'Los Angeles, CA', 1400, '{"inland_shipping":250,"transit_days":22,"coordinates":{"lat":33.7405,"lng":-118.2720}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-seattle', 'default-vendor', 'Port of Seattle', 'USA', 'Seattle, WA', 1500, '{"inland_shipping":300,"transit_days":20,"coordinates":{"lat":47.6062,"lng":-122.3321}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),

-- Destination Ports
('port-odessa', 'default-vendor', 'Port of Odessa', 'Ukraine', 'Odessa', 0, '{"inland_shipping":0,"transit_days":25,"coordinates":{"lat":46.4825,"lng":30.7233}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-poti', 'default-vendor', 'Port of Poti', 'Georgia', 'Poti', 0, '{"inland_shipping":50,"transit_days":28,"coordinates":{"lat":42.1522,"lng":41.6717}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001'),
('port-constanta', 'default-vendor', 'Port of Constanta', 'Romania', 'Constanta', 0, '{"inland_shipping":100,"transit_days":30,"coordinates":{"lat":44.1598,"lng":28.6348}}', 1, strftime('%s', 'now'), strftime('%s', 'now'), 'admin-001');

-- Insert Vendor Modifiers
INSERT INTO vendor_modifiers (id, vendor_id, modifier_type, target, ocean_modifier, usa_modifier, notes, metadata, active, updated_at, updated_by) VALUES
-- Body Type Modifiers
('mod-sedan', 'default-vendor', 'body_type', 'Sedan', 0, 0, 'Standard sedan - no additional charges', '{"category":"vehicle_type"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-suv', 'default-vendor', 'body_type', 'SUV', 100, 50, 'Standard SUV surcharge', '{"category":"vehicle_type"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-bigsuv', 'default-vendor', 'body_type', 'Big SUV', 200, 100, 'Large SUV (Escalade, Navigator, etc)', '{"category":"vehicle_type"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-pickup', 'default-vendor', 'body_type', 'Pickup', 150, 75, 'Pickup truck surcharge', '{"category":"vehicle_type"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-coupe', 'default-vendor', 'body_type', 'Coupe', 0, 0, 'Coupe - no additional charges', '{"category":"vehicle_type"}', 1, strftime('%s', 'now'), 'admin-001'),

-- Running Status
('mod-running', 'default-vendor', 'running_status', 'Running', 0, 0, 'Vehicle runs and drives', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-not-running', 'default-vendor', 'running_status', 'Not Running', 100, 150, 'Non-running vehicle surcharge', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),

-- Damage Type
('mod-no-damage', 'default-vendor', 'damage_type', 'No Damage', 0, 0, 'Clean vehicle', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-minor-damage', 'default-vendor', 'damage_type', 'Minor Damage', 50, 25, 'Minor cosmetic damage', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-front-damage', 'default-vendor', 'damage_type', 'Front Damage', 100, 50, 'Front end damage', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-rear-damage', 'default-vendor', 'damage_type', 'Rear Damage', 100, 50, 'Rear end damage', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-side-damage', 'default-vendor', 'damage_type', 'Side Damage', 75, 40, 'Side damage', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-total-loss', 'default-vendor', 'damage_type', 'Total Loss', 200, 100, 'Total loss vehicle', '{"category":"condition"}', 1, strftime('%s', 'now'), 'admin-001'),

-- Car Age
('mod-new-car', 'default-vendor', 'car_age', '0-3 years', 0, 0, 'New vehicle (0-3 years)', '{"category":"age"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-mid-car', 'default-vendor', 'car_age', '4-7 years', 0, 0, 'Mid-age vehicle (4-7 years)', '{"category":"age"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-old-car', 'default-vendor', 'car_age', '8+ years', 50, 25, 'Older vehicle (8+ years)', '{"category":"age"}', 1, strftime('%s', 'now'), 'admin-001'),

-- Auction Locations
('mod-loc-nj', 'default-vendor', 'auction_location', 'New Jersey', 0, 0, 'Close to Newark port', '{"category":"location","state":"NJ"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-loc-ga', 'default-vendor', 'auction_location', 'Georgia', 0, 100, 'Georgia auctions', '{"category":"location","state":"GA"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-loc-tx', 'default-vendor', 'auction_location', 'Texas', 0, 200, 'Texas auctions', '{"category":"location","state":"TX"}', 1, strftime('%s', 'now'), 'admin-001'),
('mod-loc-ca', 'default-vendor', 'auction_location', 'California', 0, 300, 'California auctions', '{"category":"location","state":"CA"}', 1, strftime('%s', 'now'), 'admin-001');

