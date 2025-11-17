import { Env } from '../index';
import { execute, generateId, now } from '../utils/db';

/**
 * Sync data from Google Sheets to D1 database and KV cache
 * Simplified version for local development (without googleapis)
 */
export async function syncGoogleSheets(env: Env): Promise<void> {
  console.log('[SheetsService] Starting Google Sheets sync (MOCK MODE)...');

  try {
    // Update sync status
    await env.CACHE.put('sheets:sync_status', 'running');
    await env.CACHE.put('sheets:last_sync', Date.now().toString());

    // For local development, use mock data
    // In production, implement with REST API using fetch
    const spreadsheetId = env.GOOGLE_SHEETS_ID;

    // Mock data for local development
    const vendorsData: any[] = [];
    const auctionsData = [
      ['copart_1', 'Copart', 'CA', 'percentage', '0.10', '75', 'admin', new Date().toISOString()],
      ['iaai_1', 'IAAI', 'TX', 'percentage', '0.12', '89', 'admin', new Date().toISOString()],
    ];
    const portsData = [
      ['port_1', 'Batumi', 'Georgia', 'Batumi', '1200', null, 'TRUE', new Date().toISOString()],
      ['port_2', 'Odessa', 'Ukraine', 'Odessa', '1100', null, 'TRUE', new Date().toISOString()],
    ];
    const modifiersData = [
      ['mod_1', 'sedan', '0', '0', null, new Date().toISOString()],
      ['mod_2', 'suv', '150', '50', null, new Date().toISOString()],
      ['mod_3', 'truck', '200', '75', null, new Date().toISOString()],
    ];

    // Process and cache data
    const version = now();

    // Cache Auctions
    const auctions = auctionsData.map((row) => ({
      auction_id: row[0],
      name: row[1],
      location_state: row[2],
      buyer_fee_type: row[3],
      buyer_fee_value: row[4],
      gate_fee: parseFloat(row[5]) || 0,
      updated_by: row[6] || 'system',
      updated_at: row[7] || new Date().toISOString(),
    }));

    await env.CACHE.put('sheets:auctions', JSON.stringify(auctions), {
      expirationTtl: 300, // 5 minutes
    });

    await execute(
      env.DB,
      'INSERT OR REPLACE INTO sheets_cache (id, sheet_name, data, version, synced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        generateId('cache'),
        'Auctions',
        JSON.stringify(auctions),
        version,
        now(),
        now() + 300,
      ]
    );

    // Cache Ports
    const ports = portsData.map((row) => ({
      port_id: row[0],
      name: row[1],
      country: row[2],
      city: row[3],
      base_ocean_shipping: parseFloat(row[4]) || 0,
      vendor_id: row[5] || null,
      active: row[6] === 'TRUE',
      updated_at: row[7] || new Date().toISOString(),
    }));

    await env.CACHE.put('sheets:ports', JSON.stringify(ports), {
      expirationTtl: 300,
    });

    await execute(
      env.DB,
      'INSERT OR REPLACE INTO sheets_cache (id, sheet_name, data, version, synced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        generateId('cache'),
        'Ports',
        JSON.stringify(ports),
        version,
        now(),
        now() + 300,
      ]
    );

    // Cache Body Type Modifiers
    const modifiers = modifiersData.map((row) => ({
      modifier_id: row[0],
      body_type: row[1],
      ocean_shipping_modifier: parseFloat(row[2]) || 0,
      usa_shipping_modifier: parseFloat(row[3]) || 0,
      vendor_id: row[4] || null,
      updated_at: row[5] || new Date().toISOString(),
    }));

    await env.CACHE.put('sheets:body_type_modifiers', JSON.stringify(modifiers), {
      expirationTtl: 300,
    });

    await execute(
      env.DB,
      'INSERT OR REPLACE INTO sheets_cache (id, sheet_name, data, version, synced_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [
        generateId('cache'),
        'Body_Type_Modifiers',
        JSON.stringify(modifiers),
        version,
        now(),
        now() + 300,
      ]
    );

    // Update sync status
    await env.CACHE.put('sheets:sync_status', 'success');
    
    console.log('Google Sheets sync completed successfully');
    console.log(`Synced: ${auctions.length} auctions, ${ports.length} ports, ${modifiers.length} modifiers`);

  } catch (error: any) {
    console.error('Google Sheets sync error:', error);
    await env.CACHE.put('sheets:sync_status', 'failed');
    
    // Log sync error to database
    await execute(
      env.DB,
      `INSERT INTO audit_logs (id, timestamp, user_id, user_email, user_role, action, 
       resource_type, resource_id, ip_address, user_agent, success, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('audit'),
        now(),
        'system',
        'system',
        'admin',
        'sheets_sync_error',
        'sheets',
        'sync',
        'system',
        'system',
        0,
        error.message,
      ]
    );

    throw error;
  }
}

