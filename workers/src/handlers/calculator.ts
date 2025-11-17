import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, optionalAuth } from '../middleware/auth';
import { query, queryOne, execute, generateId, now } from '../utils/db';
import { recordCalculationVersion } from '../utils/versioning';

export const calculatorRouter = new Hono<{ Bindings: Env }>();

/**
 * POST /api/calculate
 * Perform calculation
 */
calculatorRouter.post('/', optionalAuth, async (c) => {
  try {
    const input = await c.req.json();
    const user = c.get('user');

    // Validate input
    if (!input.carPrice || !input.auctionId || !input.stateOrigin || !input.portDestination || !input.bodyType || !input.vendorId) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      }, 400);
    }

    // Get pricing data from cache/sheets
    const auctionsKey = 'sheets:auctions';
    const portsKey = 'sheets:ports';
    const modifiersKey = 'sheets:body_type_modifiers';

    let auctions = await c.env.CACHE.get(auctionsKey, 'json');
    let ports = await c.env.CACHE.get(portsKey, 'json');
    let modifiers = await c.env.CACHE.get(modifiersKey, 'json');

    // Fallback to database if cache miss
    if (!auctions) {
      auctions = await query(c.env.DB, 'SELECT * FROM sheets_cache WHERE sheet_name = ?', ['Auctions']);
    }
    if (!ports) {
      ports = await query(c.env.DB, 'SELECT * FROM sheets_cache WHERE sheet_name = ?', ['Ports']);
    }
    if (!modifiers) {
      modifiers = await query(c.env.DB, 'SELECT * FROM sheets_cache WHERE sheet_name = ?', ['Body_Type_Modifiers']);
    }

    // Simplified calculation logic (use the calculator-engine from frontend for actual logic)
    const carPrice = parseFloat(input.carPrice);
    
    // Auction fee (simplified)
    const auctionFee = carPrice < 100 ? 1 : carPrice < 500 ? 25 : carPrice < 1000 ? 50 : 75;
    const gateFee = 75;
    
    // USA Shipping (simplified)
    const distance = 800; // miles (should be calculated based on state and port)
    const pricePerMile = 1.5;
    const usaShipping = 200 + (distance * pricePerMile);
    
    // Ocean shipping (simplified)
    const oceanShipping = input.bodyType === 'sedan' ? 1000 : input.bodyType === 'suv' ? 1200 : 1500;
    
    // Customs (simplified)
    const customsBase = carPrice + auctionFee + gateFee + usaShipping + oceanShipping;
    const dutyRate = 10; // 10%
    const dutyAmount = customsBase * (dutyRate / 100);
    const customsFee = 150;
    const brokerFee = 200;
    
    // Vendor fees
    const serviceFee = 500;
    const documentationFee = 200;
    
    // Total
    const total = carPrice + auctionFee + gateFee + usaShipping + oceanShipping + dutyAmount + customsFee + brokerFee + serviceFee + documentationFee;

    // Build result
    const result = {
      id: generateId('calc'),
      breakdown: {
        auctionFee: {
          amount: auctionFee + gateFee,
          gateFee,
          formula: `Buyer Fee: $${auctionFee} + Gate Fee: $${gateFee}`,
          description: 'Auction fees',
        },
        usaShipping: {
          amount: usaShipping,
          distance,
          pricePerMile,
          baseFee: 200,
          modifiers: [],
          formula: `$200 + (${distance} miles × $${pricePerMile})`,
          description: 'Inland shipping from USA',
        },
        oceanShipping: {
          amount: oceanShipping,
          containerType: 'roro',
          estimatedDays: 30,
          portFee: 100,
          formula: `Base: $${oceanShipping}`,
          description: 'Ocean shipping',
        },
        customsClearance: {
          amount: dutyAmount + customsFee + brokerFee,
          dutyRate,
          dutyAmount,
          customsFee,
          brokerFee,
          formula: `(${customsBase.toFixed(0)} × ${dutyRate}%) + $${customsFee} + $${brokerFee}`,
          description: 'Customs clearance',
        },
        vendorFees: {
          amount: serviceFee + documentationFee,
          serviceFee,
          documentationFee,
          additionalFees: [],
          description: 'Vendor service fees',
        },
      },
      total,
      currency: 'USD',
      calculatedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      vendorId: input.vendorId,
      inputData: input,
    };

    // Save calculation if user is authenticated
    if (user) {
      const timestamp = now();
      await execute(
        c.env.DB,
        'INSERT INTO calculations (id, user_id, vendor_id, input_data, result_data, total_amount, currency, created_at, valid_until, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          result.id,
          user.id,
          input.vendorId,
          JSON.stringify(input),
          JSON.stringify(result),
          total,
          'USD',
          timestamp,
          timestamp + 30 * 24 * 60 * 60,
          timestamp,
        ]
      );

      const row = await queryOne<any>(c.env.DB, 'SELECT * FROM calculations WHERE id = ?', [
        result.id,
      ]);
      if (row) {
        await recordCalculationVersion(c.env, result.id, input.vendorId, {
          snapshot: row,
          changeType: 'create',
          updatedBy: user.id,
        });
      }
    }

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Calculation error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Calculation failed',
      },
    }, 500);
  }
});

/**
 * GET /api/calculate/history
 * Get calculation history (authenticated users only)
 */
calculatorRouter.get('/history', optionalAuth, async (c) => {
  try {
    const user = c.get('user');

    if (!user) {
      return c.json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
        },
      }, 401);
    }

    const calculations = await query(
      c.env.DB,
      'SELECT id, vendor_id, total_amount, currency, created_at FROM calculations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [user.id]
    );

    return c.json({
      success: true,
      data: calculations.map((c: any) => ({
        id: c.id,
        vendorId: c.vendor_id,
        totalAmount: c.total_amount,
        currency: c.currency,
        createdAt: new Date(c.created_at * 1000).toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch history',
      },
    }, 500);
  }
});

/**
 * GET /api/calculate
 * Admin/vendor listing
 */
calculatorRouter.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const vendorIdParam = c.req.query('vendorId');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const vendorFilter = user.role === 'admin' ? vendorIdParam : user.vendorId;

    if (!vendorFilter) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'vendorId is required',
        },
      }, 404);
    }

    const calculations = await query(
      c.env.DB,
      `SELECT id, user_id, vendor_id, total_amount, currency, created_at, updated_at
       FROM calculations
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [vendorFilter, limit]
    );

    return c.json({
      success: true,
      data: calculations.map((calc: any) => ({
        id: calc.id,
        userId: calc.user_id,
        vendorId: calc.vendor_id,
        totalAmount: calc.total_amount,
        currency: calc.currency,
        createdAt: new Date(calc.created_at * 1000).toISOString(),
        updatedAt: calc.updated_at ? new Date(calc.updated_at * 1000).toISOString() : null,
      })),
    });
  } catch (error: any) {
    console.error('List calculations error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch calculations',
      },
    }, 500);
  }
});

/**
 * GET /api/calculate/:id
 * Get saved calculation
 */
calculatorRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const calcId = c.req.param('id');

    const calc = await queryOne<any>(
      c.env.DB,
      'SELECT * FROM calculations WHERE id = ?',
      [calcId]
    );

    if (!calc) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Calculation not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        ...JSON.parse(calc.result_data),
        savedAt: new Date(calc.created_at * 1000).toISOString(),
        updatedAt: calc.updated_at ? new Date(calc.updated_at * 1000).toISOString() : null,
      },
    });
  } catch (error: any) {
    console.error('Get calculation error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch calculation',
      },
    }, 500);
  }
});

/**
 * PATCH /api/calculate/:id
 * Update calculation payload
 */
calculatorRouter.patch('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const calcId = c.req.param('id');
    const body = await c.req.json();

    const current = await queryOne<any>(c.env.DB, 'SELECT * FROM calculations WHERE id = ?', [
      calcId,
    ]);
    if (!current) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Calculation not found',
        },
      }, 404);
    }

    if (
      user.role !== 'admin' &&
      user.vendorId !== current.vendor_id &&
      user.id !== current.user_id
    ) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      }, 403);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (body.totalAmount !== undefined) {
      updates.push('total_amount = ?');
      params.push(body.totalAmount);
    }
    if (body.currency) {
      updates.push('currency = ?');
      params.push(body.currency);
    }
    if (body.validUntil) {
      updates.push('valid_until = ?');
      params.push(Math.floor(new Date(body.validUntil).getTime() / 1000));
    }
    if (body.inputData) {
      updates.push('input_data = ?');
      params.push(JSON.stringify(body.inputData));
    }
    if (body.resultData) {
      updates.push('result_data = ?');
      params.push(JSON.stringify(body.resultData));
    }

    updates.push('updated_at = ?');
    params.push(now());
    params.push(calcId);

    if (updates.length === 1) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No fields to update' },
      }, 400);
    }

    await execute(
      c.env.DB,
      `UPDATE calculations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM calculations WHERE id = ?', [
      calcId,
    ]);
    if (snapshot) {
      await recordCalculationVersion(c.env, calcId, snapshot.vendor_id, {
        snapshot,
        changeType: 'update',
        updatedBy: user.id,
      });
    }

    return c.json({ success: true, data: snapshot });
  } catch (error: any) {
    console.error('Update calculation error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update calculation',
      },
    }, 500);
  }
});

/**
 * DELETE /api/calculate/:id
 * Archive calculation
 */
calculatorRouter.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const calcId = c.req.param('id');

    const current = await queryOne<any>(c.env.DB, 'SELECT * FROM calculations WHERE id = ?', [
      calcId,
    ]);
    if (!current) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }
    if (
      user.role !== 'admin' &&
      user.vendorId !== current.vendor_id &&
      user.id !== current.user_id
    ) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    await execute(
      c.env.DB,
      'UPDATE calculations SET valid_until = ?, updated_at = ? WHERE id = ?',
      [now(), now(), calcId]
    );

    const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM calculations WHERE id = ?', [
      calcId,
    ]);
    if (snapshot) {
      await recordCalculationVersion(c.env, calcId, snapshot.vendor_id, {
        snapshot,
        changeType: 'archive',
        updatedBy: user.id,
      });
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete calculation error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to archive calculation',
      },
    }, 500);
  }
});

calculatorRouter.get('/:id/versions', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const calcId = c.req.param('id');

    const current = await queryOne<any>(c.env.DB, 'SELECT vendor_id FROM calculations WHERE id = ?', [
      calcId,
    ]);
    if (!current) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }
    if (user.role !== 'admin' && user.vendorId !== current.vendor_id) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const versions = await query(
      c.env.DB,
      `SELECT version, snapshot, change_type, updated_by, updated_at
       FROM calculation_versions
       WHERE calculation_id = ?
       ORDER BY version DESC`,
      [calcId]
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
  } catch (error: any) {
    console.error('List calculation versions error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load versions' },
    }, 500);
  }
});

calculatorRouter.post('/:id/versions/:version/restore', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const calcId = c.req.param('id');
    const versionNumber = Number(c.req.param('version'));

    const versionRow = await queryOne<any>(
      c.env.DB,
      `SELECT * FROM calculation_versions WHERE calculation_id = ? AND version = ?`,
      [calcId, versionNumber]
    );
    if (!versionRow) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Version not found' } }, 404);
    }

    if (user.role !== 'admin' && user.vendorId !== versionRow.vendor_id) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    }

    const snapshot = JSON.parse(versionRow.snapshot);
    await execute(
      c.env.DB,
      `UPDATE calculations
       SET input_data = ?, result_data = ?, total_amount = ?, currency = ?, valid_until = ?, updated_at = ?
       WHERE id = ?`,
      [
        snapshot.input_data,
        snapshot.result_data,
        snapshot.total_amount,
        snapshot.currency,
        snapshot.valid_until,
        now(),
        calcId,
      ]
    );

    await recordCalculationVersion(c.env, calcId, snapshot.vendor_id, {
      snapshot,
      changeType: 'update',
      updatedBy: user.id,
      changeNotes: `Restored version ${versionNumber}`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Restore calculation version error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to restore version' },
    }, 500);
  }
});

