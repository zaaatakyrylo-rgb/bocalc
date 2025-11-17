import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware } from '../middleware/auth';
import { query, queryOne, execute, generateId, now } from '../utils/db';
import {
  recordVendorRateVersion,
  recordVendorPortVersion,
  recordVendorModifierVersion,
} from '../utils/versioning';

type BoundEnv = { Bindings: Env };

const canManageVendor = (user: any, vendorId: string) =>
  user.role === 'admin' || (!!user.vendorId && user.vendorId === vendorId);

const parseMetadata = (value: any) =>
  value && typeof value === 'object' ? JSON.stringify(value) : value || null;

// ---------------------------------------------------------------------------
// Vendor Rates Router
// ---------------------------------------------------------------------------
export const vendorRatesRouter = new Hono<BoundEnv>();
vendorRatesRouter.use('*', authMiddleware);

vendorRatesRouter.get('/', async (c) => {
  const user = c.get('user');
  const vendorIdParam = c.req.query('vendorId');
  const activeParam = c.req.query('active');

  const vendorFilter = user.role === 'admin' ? vendorIdParam : user.vendorId;

  if (!vendorFilter) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'vendorId is required' },
      },
      400
    );
  }

  const rows = await query(
    c.env.DB,
    `SELECT * FROM vendor_rates
     WHERE vendor_id = ?
       AND (? IS NULL OR active = ?)
     ORDER BY effective_at DESC`,
    [vendorFilter, activeParam ?? null, activeParam ?? null]
  );

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      vendorId: row.vendor_id,
      rateType: row.rate_type,
      name: row.name,
      description: row.description,
      baseValue: row.base_value,
      currency: row.currency,
      effectiveAt: new Date(row.effective_at * 1000).toISOString(),
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      active: row.active === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
      updatedBy: row.updated_by,
    })),
  });
});

vendorRatesRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const { vendorId, rateType, name, description, baseValue, currency, effectiveAt, metadata } =
    body;

  if (!vendorId || !rateType || !name) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      },
      400
    );
  }

  if (!canManageVendor(user, vendorId)) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      },
      403
    );
  }

  const rateId = generateId('vrate');
  const timestamp = now();
  await execute(
    c.env.DB,
    `INSERT INTO vendor_rates
     (id, vendor_id, rate_type, name, description, base_value, currency, effective_at, metadata, active, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      rateId,
      vendorId,
      rateType,
      name,
      description || null,
      baseValue ?? 0,
      currency || 'USD',
      effectiveAt ? Math.floor(new Date(effectiveAt).getTime() / 1000) : timestamp,
      parseMetadata(metadata),
      timestamp,
      timestamp,
      user.id,
    ]
  );

  const snapshot = await queryOne(c.env.DB, 'SELECT * FROM vendor_rates WHERE id = ?', [rateId]);
  if (snapshot) {
    await recordVendorRateVersion(c.env, rateId, vendorId, {
      snapshot,
      changeType: 'create',
      updatedBy: user.id,
    });
  }

  return c.json({
    success: true,
    data: snapshot,
  });
});

vendorRatesRouter.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_rates WHERE id = ?', [id]);
  if (!current) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rate not found' },
      },
      404
    );
  }

  if (!canManageVendor(user, current.vendor_id)) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      },
      403
    );
  }

  const updates: string[] = [];
  const params: any[] = [];

  ['rateType', 'name', 'description', 'currency'].forEach((field) => {
    if (body[field] !== undefined) {
      const column =
        field === 'rateType'
          ? 'rate_type'
          : field === 'description'
          ? 'description'
          : field === 'currency'
          ? 'currency'
          : 'name';
      updates.push(`${column} = ?`);
      params.push(body[field]);
    }
  });

  if (body.baseValue !== undefined) {
    updates.push('base_value = ?');
    params.push(body.baseValue);
  }

  if (body.effectiveAt) {
    updates.push('effective_at = ?');
    params.push(Math.floor(new Date(body.effectiveAt).getTime() / 1000));
  }

  if (body.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(parseMetadata(body.metadata));
  }

  if (body.active !== undefined && user.role === 'admin') {
    updates.push('active = ?');
    params.push(body.active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  params.push(now());
  updates.push('updated_by = ?');
  params.push(user.id);
  params.push(id);

  await execute(
    c.env.DB,
    `UPDATE vendor_rates SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_rates WHERE id = ?', [id]);
  if (snapshot) {
    await recordVendorRateVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'update',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true, data: snapshot });
});

vendorRatesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_rates WHERE id = ?', [id]);
  if (!current) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Rate not found' },
      },
      404
    );
  }

  if (!canManageVendor(user, current.vendor_id)) {
    return c.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      },
      403
    );
  }

  await execute(
    c.env.DB,
    'UPDATE vendor_rates SET active = 0, updated_at = ?, updated_by = ? WHERE id = ?',
    [now(), user.id, id]
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_rates WHERE id = ?', [id]);
  if (snapshot) {
    await recordVendorRateVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'deactivate',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true });
});

vendorRatesRouter.get('/:id/versions', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(c.env.DB, 'SELECT vendor_id FROM vendor_rates WHERE id = ?', [
    id,
  ]);
  if (!current) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Rate not found' } },
      404
    );
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const versions = await query(
    c.env.DB,
    `SELECT version, snapshot, change_type, updated_by, updated_at
     FROM vendor_rates_versions
     WHERE rate_id = ?
     ORDER BY version DESC`,
    [id]
  );

  return c.json({
    success: true,
    data: versions.map((v: any) => ({
      version: v.version,
      changeType: v.change_type,
      updatedBy: v.updated_by,
      updatedAt: new Date(v.updated_at * 1000).toISOString(),
      snapshot: JSON.parse(v.snapshot),
    })),
  });
});

vendorRatesRouter.post('/:id/versions/:version/restore', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const versionNumber = Number(c.req.param('version'));

  const versionRow = await queryOne<any>(
    c.env.DB,
    `SELECT * FROM vendor_rates_versions WHERE rate_id = ? AND version = ?`,
    [id, versionNumber]
  );

  if (!versionRow) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } },
      404
    );
  }
  if (!canManageVendor(user, versionRow.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const snapshot = JSON.parse(versionRow.snapshot);
  await execute(
    c.env.DB,
    `UPDATE vendor_rates
     SET name = ?, description = ?, rate_type = ?, base_value = ?, currency = ?, effective_at = ?, metadata = ?, active = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`,
    [
      snapshot.name,
      snapshot.description,
      snapshot.rate_type,
      snapshot.base_value,
      snapshot.currency,
      snapshot.effective_at,
      snapshot.metadata,
      snapshot.active,
      now(),
      user.id,
      id,
    ]
  );

  await recordVendorRateVersion(c.env, id, snapshot.vendor_id, {
    snapshot,
    changeType: 'update',
    updatedBy: user.id,
    changeNotes: `Restored version ${versionNumber}`,
  });

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Vendor Ports Router
// ---------------------------------------------------------------------------
export const vendorPortsRouter = new Hono<BoundEnv>();
vendorPortsRouter.use('*', authMiddleware);

vendorPortsRouter.get('/', async (c) => {
  const user = c.get('user');
  const vendorIdParam = c.req.query('vendorId');
  const vendorFilter = user.role === 'admin' ? vendorIdParam : user.vendorId;

  if (!vendorFilter) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'vendorId is required' } },
      400
    );
  }

  const rows = await query(
    c.env.DB,
    `SELECT * FROM vendor_ports WHERE vendor_id = ? ORDER BY name ASC`,
    [vendorFilter]
  );

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      vendorId: row.vendor_id,
      name: row.name,
      country: row.country,
      city: row.city,
      baseOceanShipping: row.base_ocean_shipping,
      inlandShipping: row.inland_shipping,
      currency: row.currency,
      transitTimeDays: row.transit_time_days,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      active: row.active === 1,
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    })),
  });
});

vendorPortsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const {
    vendorId,
    name,
    country,
    city,
    baseOceanShipping,
    inlandShipping,
    currency,
    transitTimeDays,
    metadata,
  } = body;

  if (!vendorId || !name || !country || !city) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
      400
    );
  }

  if (!canManageVendor(user, vendorId)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const portId = generateId('vport');
  const timestamp = now();
  await execute(
    c.env.DB,
    `INSERT INTO vendor_ports
     (id, vendor_id, name, country, city, base_ocean_shipping, inland_shipping, currency, transit_time_days, metadata, active, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      portId,
      vendorId,
      name,
      country,
      city,
      baseOceanShipping ?? 0,
      inlandShipping ?? 0,
      currency || 'USD',
      transitTimeDays || null,
      parseMetadata(metadata),
      timestamp,
      timestamp,
      user.id,
    ]
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_ports WHERE id = ?', [
    portId,
  ]);
  if (snapshot) {
    await recordVendorPortVersion(c.env, portId, vendorId, {
      snapshot,
      changeType: 'create',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true, data: snapshot });
});

vendorPortsRouter.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_ports WHERE id = ?', [id]);
  if (!current) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Port not found' } }, 404);
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const updates: string[] = [];
  const params: any[] = [];

  ['name', 'country', 'city', 'currency'].forEach((field) => {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(body[field]);
    }
  });

  if (body.baseOceanShipping !== undefined) {
    updates.push('base_ocean_shipping = ?');
    params.push(body.baseOceanShipping);
  }
  if (body.inlandShipping !== undefined) {
    updates.push('inland_shipping = ?');
    params.push(body.inlandShipping);
  }
  if (body.transitTimeDays !== undefined) {
    updates.push('transit_time_days = ?');
    params.push(body.transitTimeDays);
  }
  if (body.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(parseMetadata(body.metadata));
  }
  if (body.active !== undefined && user.role === 'admin') {
    updates.push('active = ?');
    params.push(body.active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  params.push(now());
  updates.push('updated_by = ?');
  params.push(user.id);
  params.push(id);

  await execute(
    c.env.DB,
    `UPDATE vendor_ports SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_ports WHERE id = ?', [id]);
  if (snapshot) {
    await recordVendorPortVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'update',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true, data: snapshot });
});

vendorPortsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_ports WHERE id = ?', [id]);
  if (!current) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Port not found' } }, 404);
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  await execute(
    c.env.DB,
    'UPDATE vendor_ports SET active = 0, updated_at = ?, updated_by = ? WHERE id = ?',
    [now(), user.id, id]
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_ports WHERE id = ?', [id]);
  if (snapshot) {
    await recordVendorPortVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'deactivate',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true });
});

vendorPortsRouter.get('/:id/versions', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(c.env.DB, 'SELECT vendor_id FROM vendor_ports WHERE id = ?', [
    id,
  ]);
  if (!current) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Port not found' } }, 404);
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const versions = await query(
    c.env.DB,
    `SELECT version, snapshot, change_type, updated_by, updated_at
     FROM vendor_ports_versions
     WHERE port_id = ?
     ORDER BY version DESC`,
    [id]
  );

  return c.json({
    success: true,
    data: versions.map((v: any) => ({
      version: v.version,
      changeType: v.change_type,
      updatedBy: v.updated_by,
      updatedAt: new Date(v.updated_at * 1000).toISOString(),
      snapshot: JSON.parse(v.snapshot),
    })),
  });
});

vendorPortsRouter.post('/:id/versions/:version/restore', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const versionNumber = Number(c.req.param('version'));

  const versionRow = await queryOne<any>(
    c.env.DB,
    `SELECT * FROM vendor_ports_versions WHERE port_id = ? AND version = ?`,
    [id, versionNumber]
  );
  if (!versionRow) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } },
      404
    );
  }
  if (!canManageVendor(user, versionRow.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const snapshot = JSON.parse(versionRow.snapshot);
  await execute(
    c.env.DB,
    `UPDATE vendor_ports
     SET name = ?, country = ?, city = ?, base_ocean_shipping = ?, inland_shipping = ?, currency = ?, transit_time_days = ?, metadata = ?, active = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`,
    [
      snapshot.name,
      snapshot.country,
      snapshot.city,
      snapshot.base_ocean_shipping,
      snapshot.inland_shipping,
      snapshot.currency,
      snapshot.transit_time_days,
      snapshot.metadata,
      snapshot.active,
      now(),
      user.id,
      id,
    ]
  );

  await recordVendorPortVersion(c.env, id, snapshot.vendor_id, {
    snapshot,
    changeType: 'update',
    updatedBy: user.id,
    changeNotes: `Restored version ${versionNumber}`,
  });

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Vendor Modifiers Router
// ---------------------------------------------------------------------------
export const vendorModifiersRouter = new Hono<BoundEnv>();
vendorModifiersRouter.use('*', authMiddleware);

vendorModifiersRouter.get('/', async (c) => {
  const user = c.get('user');
  const vendorIdParam = c.req.query('vendorId');
  const vendorFilter = user.role === 'admin' ? vendorIdParam : user.vendorId;

  if (!vendorFilter) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'vendorId is required' } },
      400
    );
  }

  const rows = await query(
    c.env.DB,
    `SELECT * FROM vendor_modifiers WHERE vendor_id = ? ORDER BY modifier_type, target`,
    [vendorFilter]
  );

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      vendorId: row.vendor_id,
      modifierType: row.modifier_type,
      target: row.target,
      oceanModifier: row.ocean_modifier,
      usaModifier: row.usa_modifier,
      notes: row.notes,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      active: row.active === 1,
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    })),
  });
});

vendorModifiersRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { vendorId, modifierType, target, oceanModifier, usaModifier, notes, metadata } = body;

  if (!vendorId || !modifierType || !target) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
      400
    );
  }
  if (!canManageVendor(user, vendorId)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const modifierId = generateId('vmod');
  const timestamp = now();
  await execute(
    c.env.DB,
    `INSERT INTO vendor_modifiers
     (id, vendor_id, modifier_type, target, ocean_modifier, usa_modifier, notes, metadata, active, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      modifierId,
      vendorId,
      modifierType,
      target,
      oceanModifier ?? 0,
      usaModifier ?? 0,
      notes || null,
      parseMetadata(metadata),
      timestamp,
      timestamp,
      user.id,
    ]
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_modifiers WHERE id = ?', [
    modifierId,
  ]);
  if (snapshot) {
    await recordVendorModifierVersion(c.env, modifierId, vendorId, {
      snapshot,
      changeType: 'create',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true, data: snapshot });
});

vendorModifiersRouter.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_modifiers WHERE id = ?', [
    id,
  ]);
  if (!current) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Modifier not found' } },
      404
    );
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const updates: string[] = [];
  const params: any[] = [];

  ['modifierType', 'target', 'notes'].forEach((field) => {
    if (body[field] !== undefined) {
      const column =
        field === 'modifierType' ? 'modifier_type' : field === 'target' ? 'target' : 'notes';
      updates.push(`${column} = ?`);
      params.push(body[field]);
    }
  });

  if (body.oceanModifier !== undefined) {
    updates.push('ocean_modifier = ?');
    params.push(body.oceanModifier);
  }
  if (body.usaModifier !== undefined) {
    updates.push('usa_modifier = ?');
    params.push(body.usaModifier);
  }
  if (body.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(parseMetadata(body.metadata));
  }
  if (body.active !== undefined && user.role === 'admin') {
    updates.push('active = ?');
    params.push(body.active ? 1 : 0);
  }

  updates.push('updated_at = ?');
  params.push(now());
  updates.push('updated_by = ?');
  params.push(user.id);
  params.push(id);

  await execute(
    c.env.DB,
    `UPDATE vendor_modifiers SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_modifiers WHERE id = ?', [
    id,
  ]);
  if (snapshot) {
    await recordVendorModifierVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'update',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true, data: snapshot });
});

vendorModifiersRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_modifiers WHERE id = ?', [
    id,
  ]);
  if (!current) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Modifier not found' } },
      404
    );
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  await execute(
    c.env.DB,
    'UPDATE vendor_modifiers SET active = 0, updated_at = ?, updated_by = ? WHERE id = ?',
    [now(), user.id, id]
  );

  const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM vendor_modifiers WHERE id = ?', [
    id,
  ]);
  if (snapshot) {
    await recordVendorModifierVersion(c.env, id, snapshot.vendor_id, {
      snapshot,
      changeType: 'deactivate',
      updatedBy: user.id,
    });
  }

  return c.json({ success: true });
});

vendorModifiersRouter.get('/:id/versions', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne<any>(
    c.env.DB,
    'SELECT vendor_id FROM vendor_modifiers WHERE id = ?',
    [id]
  );
  if (!current) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Modifier not found' } },
      404
    );
  }
  if (!canManageVendor(user, current.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const versions = await query(
    c.env.DB,
    `SELECT version, snapshot, change_type, updated_by, updated_at
     FROM vendor_modifiers_versions
     WHERE modifier_id = ?
     ORDER BY version DESC`,
    [id]
  );

  return c.json({
    success: true,
    data: versions.map((v: any) => ({
      version: v.version,
      changeType: v.change_type,
      updatedBy: v.updated_by,
      updatedAt: new Date(v.updated_at * 1000).toISOString(),
      snapshot: JSON.parse(v.snapshot),
    })),
  });
});

vendorModifiersRouter.post('/:id/versions/:version/restore', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const versionNumber = Number(c.req.param('version'));

  const versionRow = await queryOne<any>(
    c.env.DB,
    `SELECT * FROM vendor_modifiers_versions WHERE modifier_id = ? AND version = ?`,
    [id, versionNumber]
  );
  if (!versionRow) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } },
      404
    );
  }
  if (!canManageVendor(user, versionRow.vendor_id)) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  }

  const snapshot = JSON.parse(versionRow.snapshot);
  await execute(
    c.env.DB,
    `UPDATE vendor_modifiers
     SET modifier_type = ?, target = ?, ocean_modifier = ?, usa_modifier = ?, notes = ?, metadata = ?, active = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`,
    [
      snapshot.modifier_type,
      snapshot.target,
      snapshot.ocean_modifier,
      snapshot.usa_modifier,
      snapshot.notes,
      snapshot.metadata,
      snapshot.active,
      now(),
      user.id,
      id,
    ]
  );

  await recordVendorModifierVersion(c.env, id, snapshot.vendor_id, {
    snapshot,
    changeType: 'update',
    updatedBy: user.id,
    changeNotes: `Restored version ${versionNumber}`,
  });

  return c.json({ success: true });
});


