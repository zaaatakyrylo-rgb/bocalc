/**
 * Law Variables API Handler
 * Admin-only management of legislative variables (taxes, duties, exchange rates)
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware } from '../middleware/auth';
import { query, queryOne, execute, generateId, now } from '../utils/db';

type BoundEnv = { Bindings: Env };

// Admin-only check middleware
const adminOnly = async (c: any, next: any) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      },
      403
    );
  }
  await next();
};

const recordLawRateVersion = async (
  env: Env,
  rateId: string,
  snapshot: any,
  changeType: string,
  updatedBy: string,
  changeReason?: string
) => {
  const versions = await query(
    env.DB,
    'SELECT MAX(version) as max_version FROM law_rates_versions WHERE rate_id = ?',
    [rateId]
  );
  const nextVersion = (versions[0]?.max_version || 0) + 1;

  await execute(
    env.DB,
    `INSERT INTO law_rates_versions 
     (id, rate_id, version, snapshot, change_type, change_reason, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateId('lrv'),
      rateId,
      nextVersion,
      JSON.stringify(snapshot),
      changeType,
      changeReason || null,
      updatedBy,
      now(),
    ]
  );
};

// ============================================================================
// Law Variable Types Router
// ============================================================================
export const lawVariableTypesRouter = new Hono<BoundEnv>();
lawVariableTypesRouter.use('*', authMiddleware);

// GET /api/law-variable-types - List all variable types
lawVariableTypesRouter.get('/', async (c) => {
  const category = c.req.query('category');
  const active = c.req.query('active');

  let sql = 'SELECT * FROM law_variable_types WHERE 1=1';
  const params: any[] = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (active !== undefined) {
    sql += ' AND active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  sql += ' ORDER BY category, name';

  const rows = await query(c.env.DB, sql, params);

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      description: row.description,
      unit: row.unit,
      active: row.active === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    })),
  });
});

// GET /api/law-variable-types/:id - Get single variable type
lawVariableTypesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await queryOne(c.env.DB, 'SELECT * FROM law_variable_types WHERE id = ?', [id]);

  if (!row) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Variable type not found' },
      },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      description: row.description,
      unit: row.unit,
      active: row.active === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    },
  });
});

// ============================================================================
// Law Rates Router (Admin Only)
// ============================================================================
export const lawRatesRouter = new Hono<BoundEnv>();
lawRatesRouter.use('*', authMiddleware);

// GET /api/law-rates - List all law rates
lawRatesRouter.get('/', async (c) => {
  const variableTypeId = c.req.query('variableTypeId');
  const fuelType = c.req.query('fuelType');
  const activeOnly = c.req.query('activeOnly') === 'true';

  let sql = `
    SELECT lr.*, lvt.code as variable_code, lvt.name as variable_name
    FROM law_rates lr
    JOIN law_variable_types lvt ON lr.variable_type_id = lvt.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (variableTypeId) {
    sql += ' AND lr.variable_type_id = ?';
    params.push(variableTypeId);
  }

  if (fuelType) {
    sql += ' AND (lr.fuel_type = ? OR lr.fuel_type IS NULL)';
    params.push(fuelType);
  }

  if (activeOnly) {
    const currentTime = now();
    sql += ' AND lr.effective_from <= ? AND (lr.effective_to IS NULL OR lr.effective_to >= ?)';
    params.push(currentTime, currentTime);
  }

  sql += ' ORDER BY lr.effective_from DESC, lr.rate_name';

  const rows = await query(c.env.DB, sql, params);

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      variableTypeId: row.variable_type_id,
      variableCode: row.variable_code,
      variableName: row.variable_name,
      rateName: row.rate_name,
      fuelType: row.fuel_type,
      volumeMin: row.volume_min,
      volumeMax: row.volume_max,
      ageMin: row.age_min,
      ageMax: row.age_max,
      rateValue: row.rate_value,
      rateUnit: row.rate_unit,
      legalReference: row.legal_reference,
      description: row.description,
      effectiveFrom: new Date(row.effective_from * 1000).toISOString(),
      effectiveTo: row.effective_to ? new Date(row.effective_to * 1000).toISOString() : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at * 1000).toISOString(),
      updatedAt: new Date(row.updated_at * 1000).toISOString(),
    })),
  });
});

// POST /api/law-rates - Create new law rate (admin only)
lawRatesRouter.post('/', adminOnly, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();

  const {
    variableTypeId,
    rateName,
    fuelType,
    volumeMin,
    volumeMax,
    ageMin,
    ageMax,
    rateValue,
    rateUnit,
    legalReference,
    description,
    effectiveFrom,
  } = body;

  // Validation
  if (!variableTypeId || !rateName || rateValue === undefined || !rateUnit) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      },
      400
    );
  }

  const rateId = generateId('lr');
  const timestamp = now();

  await execute(
    c.env.DB,
    `INSERT INTO law_rates 
     (id, variable_type_id, rate_name, fuel_type, volume_min, volume_max, 
      age_min, age_max, rate_value, rate_unit, legal_reference, description, 
      effective_from, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rateId,
      variableTypeId,
      rateName,
      fuelType || null,
      volumeMin || null,
      volumeMax || null,
      ageMin || null,
      ageMax || null,
      rateValue,
      rateUnit,
      legalReference || null,
      description || null,
      effectiveFrom ? Math.floor(new Date(effectiveFrom).getTime() / 1000) : timestamp,
      user.id,
      timestamp,
      timestamp,
    ]
  );

  const snapshot = await queryOne(c.env.DB, 'SELECT * FROM law_rates WHERE id = ?', [rateId]);

  if (snapshot) {
    await recordLawRateVersion(c.env, rateId, snapshot, 'create', user.id);
  }

  return c.json({ success: true, data: snapshot });
});

// PATCH /api/law-rates/:id - Update law rate (admin only)
lawRatesRouter.patch('/:id', adminOnly, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json();

  const current = await queryOne(c.env.DB, 'SELECT * FROM law_rates WHERE id = ?', [id]);

  if (!current) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Law rate not found' },
      },
      404
    );
  }

  const updates: string[] = [];
  const params: any[] = [];

  // Update allowed fields
  const fields = [
    'rateName',
    'fuelType',
    'volumeMin',
    'volumeMax',
    'ageMin',
    'ageMax',
    'rateValue',
    'rateUnit',
    'legalReference',
    'description',
  ];

  fields.forEach((field) => {
    if (body[field] !== undefined) {
      const snakeCase = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      updates.push(`${snakeCase} = ?`);
      params.push(body[field]);
    }
  });

  if (body.effectiveFrom) {
    updates.push('effective_from = ?');
    params.push(Math.floor(new Date(body.effectiveFrom).getTime() / 1000));
  }

  if (body.effectiveTo !== undefined) {
    updates.push('effective_to = ?');
    params.push(body.effectiveTo ? Math.floor(new Date(body.effectiveTo).getTime() / 1000) : null);
  }

  if (updates.length === 0) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      },
      400
    );
  }

  updates.push('updated_at = ?');
  params.push(now());
  params.push(id);

  await execute(c.env.DB, `UPDATE law_rates SET ${updates.join(', ')} WHERE id = ?`, params);

  const snapshot = await queryOne(c.env.DB, 'SELECT * FROM law_rates WHERE id = ?', [id]);

  if (snapshot) {
    await recordLawRateVersion(c.env, id, snapshot, 'update', user.id, body.changeReason);
  }

  return c.json({ success: true, data: snapshot });
});

// DELETE /api/law-rates/:id - Deactivate law rate (admin only)
lawRatesRouter.delete('/:id', adminOnly, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const current = await queryOne(c.env.DB, 'SELECT * FROM law_rates WHERE id = ?', [id]);

  if (!current) {
    return c.json(
      {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Law rate not found' },
      },
      404
    );
  }

  // Set effective_to to current time (deactivate)
  const timestamp = now();
  await execute(
    c.env.DB,
    'UPDATE law_rates SET effective_to = ?, updated_at = ? WHERE id = ?',
    [timestamp, timestamp, id]
  );

  const snapshot = await queryOne(c.env.DB, 'SELECT * FROM law_rates WHERE id = ?', [id]);

  if (snapshot) {
    await recordLawRateVersion(c.env, id, snapshot, 'deactivate', user.id);
  }

  return c.json({ success: true });
});

// GET /api/law-rates/:id/versions - Get version history
lawRatesRouter.get('/:id/versions', adminOnly, async (c) => {
  const id = c.req.param('id');

  const versions = await query(
    c.env.DB,
    `SELECT version, snapshot, change_type, change_reason, updated_by, updated_at
     FROM law_rates_versions
     WHERE rate_id = ?
     ORDER BY version DESC`,
    [id]
  );

  return c.json({
    success: true,
    data: versions.map((v: any) => ({
      version: v.version,
      changeType: v.change_type,
      changeReason: v.change_reason,
      updatedBy: v.updated_by,
      updatedAt: new Date(v.updated_at * 1000).toISOString(),
      snapshot: JSON.parse(v.snapshot),
    })),
  });
});

// ============================================================================
// Exchange Rates Router
// ============================================================================
export const exchangeRatesRouter = new Hono<BoundEnv>();
exchangeRatesRouter.use('*', authMiddleware);

// GET /api/exchange-rates - List exchange rates
exchangeRatesRouter.get('/', async (c) => {
  const variableTypeId = c.req.query('variableTypeId');
  const latest = c.req.query('latest') === 'true';

  let sql = `
    SELECT er.*, lvt.code as variable_code, lvt.name as variable_name
    FROM exchange_rates er
    JOIN law_variable_types lvt ON er.variable_type_id = lvt.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (variableTypeId) {
    sql += ' AND er.variable_type_id = ?';
    params.push(variableTypeId);
  }

  if (latest) {
    // Get only the latest rate for each variable type
    sql = `
      SELECT er.*, lvt.code as variable_code, lvt.name as variable_name
      FROM exchange_rates er
      JOIN law_variable_types lvt ON er.variable_type_id = lvt.id
      WHERE er.rate_date = (
        SELECT MAX(rate_date) 
        FROM exchange_rates 
        WHERE variable_type_id = er.variable_type_id
      )
    `;
    if (variableTypeId) {
      sql += ' AND er.variable_type_id = ?';
    }
  }

  sql += ' ORDER BY er.rate_date DESC, lvt.name';

  const rows = await query(c.env.DB, sql, params);

  return c.json({
    success: true,
    data: rows.map((row: any) => ({
      id: row.id,
      variableTypeId: row.variable_type_id,
      variableCode: row.variable_code,
      variableName: row.variable_name,
      rateName: row.rate_name,
      rateValue: row.rate_value,
      rateDate: new Date(row.rate_date * 1000).toISOString().split('T')[0],
      source: row.source,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    })),
  });
});

// POST /api/exchange-rates - Add new exchange rate (admin only)
exchangeRatesRouter.post('/', adminOnly, async (c) => {
  const body = await c.req.json();
  const { variableTypeId, rateName, rateValue, rateDate, source } = body;

  if (!variableTypeId || !rateName || rateValue === undefined) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      },
      400
    );
  }

  const rateId = generateId('er');
  const timestamp = now();
  const rateDateUnix = rateDate ? Math.floor(new Date(rateDate).getTime() / 1000) : timestamp;

  await execute(
    c.env.DB,
    `INSERT INTO exchange_rates 
     (id, variable_type_id, rate_name, rate_value, rate_date, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [rateId, variableTypeId, rateName, rateValue, rateDateUnix, source || null, timestamp]
  );

  const row = await queryOne(c.env.DB, 'SELECT * FROM exchange_rates WHERE id = ?', [rateId]);

  return c.json({ success: true, data: row });
});


