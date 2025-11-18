/**
 * Calculator Data API
 * Unified endpoint для получения всех данных необходимых для расчета
 * Возвращает законодательные переменные + коммерческие тарифы вендора
 */

import { Hono } from 'hono';
import { Env } from '../index';
import { query, now } from '../utils/db';

type BoundEnv = { Bindings: Env };

/**
 * Unified Calculator Data Router
 * GET /api/calculator/data - Get all data for calculator
 */
export const calculatorDataRouter = new Hono<BoundEnv>();

// GET /api/calculator/data?vendorId=xxx&date=2025-11-18
calculatorDataRouter.get('/data', async (c) => {
  const vendorId = c.req.query('vendorId');
  const dateParam = c.req.query('date');

  if (!vendorId) {
    return c.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'vendorId is required' },
      },
      400
    );
  }

  // Parse date or use current timestamp
  const targetDate = dateParam ? Math.floor(new Date(dateParam).getTime() / 1000) : now();

  try {
    // ========================================================================
    // 1. Get Law Variables (Legislative rates - common for all vendors)
    // ========================================================================
    
    // Get active law rates
    const lawRates = await query(
      c.env.DB,
      `SELECT lr.*, lvt.code as variable_code, lvt.name as variable_name, lvt.category, lvt.unit
       FROM law_rates lr
       JOIN law_variable_types lvt ON lr.variable_type_id = lvt.id
       WHERE lr.effective_from <= ?
         AND (lr.effective_to IS NULL OR lr.effective_to >= ?)
       ORDER BY lvt.code, lr.rate_name`,
      [targetDate, targetDate]
    );

    // Get latest exchange rates
    const exchangeRates = await query(
      c.env.DB,
      `SELECT er.*, lvt.code as variable_code, lvt.name as variable_name
       FROM exchange_rates er
       JOIN law_variable_types lvt ON er.variable_type_id = lvt.id
       WHERE er.rate_date <= ?
         AND er.rate_date = (
           SELECT MAX(rate_date)
           FROM exchange_rates
           WHERE variable_type_id = er.variable_type_id
             AND rate_date <= ?
         )
       ORDER BY lvt.code`,
      [targetDate, targetDate]
    );

    // Organize law data by category
    const lawData: any = {
      exciseTax: {
        rates: [],
        ageMultipliers: [],
      },
      importDuty: null,
      vat: null,
      customsClearance: null,
    };

    const exchangeRatesData: any = {};

    // Process law rates
    lawRates.forEach((rate: any) => {
      if (rate.variable_code === 'excise_tax') {
        if (rate.rate_unit === 'multiplier') {
          // Age multiplier
          lawData.exciseTax.ageMultipliers.push({
            ageMin: rate.age_min,
            ageMax: rate.age_max,
            multiplier: rate.rate_value,
            description: rate.description,
          });
        } else {
          // Base rate
          lawData.exciseTax.rates.push({
            fuelType: rate.fuel_type,
            volumeMin: rate.volume_min,
            volumeMax: rate.volume_max,
            rateValue: rate.rate_value,
            rateUnit: rate.rate_unit,
            description: rate.description,
            legalReference: rate.legal_reference,
          });
        }
      } else if (rate.variable_code === 'import_duty') {
        lawData.importDuty = {
          rate: rate.rate_value,
          unit: rate.rate_unit,
          description: rate.description,
          legalReference: rate.legal_reference,
        };
      } else if (rate.variable_code === 'vat') {
        lawData.vat = {
          rate: rate.rate_value,
          unit: rate.rate_unit,
          description: rate.description,
          legalReference: rate.legal_reference,
        };
      } else if (rate.variable_code === 'customs_clearance') {
        lawData.customsClearance = {
          baseFee: rate.rate_value,
          unit: rate.rate_unit,
          description: rate.description,
          legalReference: rate.legal_reference,
        };
      }
    });

    // Process exchange rates
    exchangeRates.forEach((rate: any) => {
      exchangeRatesData[rate.variable_code] = {
        rate: rate.rate_value,
        date: new Date(rate.rate_date * 1000).toISOString().split('T')[0],
        source: rate.source,
      };
    });

    // ========================================================================
    // 2. Get Vendor Data (Commercial rates - vendor-specific)
    // ========================================================================

    // Get vendor info
    const vendor = await query(
      c.env.DB,
      'SELECT id, name, slug, active, settings FROM vendors WHERE id = ? AND active = 1',
      [vendorId]
    );

    if (vendor.length === 0) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Vendor not found or inactive' },
        },
        404
      );
    }

    // Get vendor rates (auction fees, service fees, etc.)
    const vendorRates = await query(
      c.env.DB,
      `SELECT * FROM vendor_rates
       WHERE vendor_id = ?
         AND active = 1
         AND effective_at <= ?
       ORDER BY rate_type, name`,
      [vendorId, targetDate]
    );

    // Get vendor ports (destination-specific pricing)
    const vendorPorts = await query(
      c.env.DB,
      `SELECT * FROM vendor_ports
       WHERE vendor_id = ?
         AND active = 1
       ORDER BY country, name`,
      [vendorId]
    );

    // Get vendor modifiers (body type, damage, etc.)
    const vendorModifiers = await query(
      c.env.DB,
      `SELECT * FROM vendor_modifiers
       WHERE vendor_id = ?
         AND active = 1
       ORDER BY modifier_type, target`,
      [vendorId]
    );

    // Organize vendor rates by type
    const vendorRatesData: any = {};
    vendorRates.forEach((rate: any) => {
      if (!vendorRatesData[rate.rate_type]) {
        vendorRatesData[rate.rate_type] = [];
      }
      vendorRatesData[rate.rate_type].push({
        id: rate.id,
        name: rate.name,
        description: rate.description,
        baseValue: rate.base_value,
        currency: rate.currency,
        metadata: rate.metadata ? JSON.parse(rate.metadata) : null,
      });
    });

    // Organize vendor ports by country
    const portsData = vendorPorts.map((port: any) => ({
      id: port.id,
      name: port.name,
      country: port.country,
      city: port.city,
      baseOceanShipping: port.base_ocean_shipping,
      inlandShipping: port.inland_shipping,
      currency: port.currency,
      transitTimeDays: port.transit_time_days,
      metadata: port.metadata ? JSON.parse(port.metadata) : null,
    }));

    // Organize modifiers by type
    const modifiersData: any = {};
    vendorModifiers.forEach((mod: any) => {
      if (!modifiersData[mod.modifier_type]) {
        modifiersData[mod.modifier_type] = {};
      }
      modifiersData[mod.modifier_type][mod.target] = {
        oceanModifier: mod.ocean_modifier,
        usaModifier: mod.usa_modifier,
        notes: mod.notes,
        metadata: mod.metadata ? JSON.parse(mod.metadata) : null,
      };
    });

    // ========================================================================
    // 3. Build Unified Response
    // ========================================================================

    return c.json({
      success: true,
      version: new Date(targetDate * 1000).toISOString(),
      generatedAt: new Date().toISOString(),
      data: {
        // Legislative variables (common for all)
        law: {
          exciseTax: lawData.exciseTax,
          importDuty: lawData.importDuty,
          vat: lawData.vat,
          customsClearance: lawData.customsClearance,
        },
        
        // Exchange rates
        exchangeRates: exchangeRatesData,

        // Vendor-specific data
        vendor: {
          id: vendor[0].id,
          name: vendor[0].name,
          slug: vendor[0].slug,
          settings: JSON.parse(vendor[0].settings),
        },

        // Commercial rates
        rates: vendorRatesData,
        
        // Ports
        ports: portsData,
        
        // Modifiers
        modifiers: modifiersData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching calculator data:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch calculator data',
          details: error.message,
        },
      },
      500
    );
  }
});

// GET /api/calculator/data/preview - Preview structure (no vendorId required)
calculatorDataRouter.get('/data/preview', async (c) => {
  const dateParam = c.req.query('date');
  const targetDate = dateParam ? Math.floor(new Date(dateParam).getTime() / 1000) : now();

  try {
    // Get law rates
    const lawRates = await query(
      c.env.DB,
      `SELECT lr.*, lvt.code as variable_code, lvt.name as variable_name
       FROM law_rates lr
       JOIN law_variable_types lvt ON lr.variable_type_id = lvt.id
       WHERE lr.effective_from <= ?
         AND (lr.effective_to IS NULL OR lr.effective_to >= ?)
       ORDER BY lvt.code`,
      [targetDate, targetDate]
    );

    // Get exchange rates
    const exchangeRates = await query(
      c.env.DB,
      `SELECT er.*, lvt.code as variable_code
       FROM exchange_rates er
       JOIN law_variable_types lvt ON er.variable_type_id = lvt.id
       WHERE er.rate_date = (
         SELECT MAX(rate_date)
         FROM exchange_rates
         WHERE variable_type_id = er.variable_type_id
           AND rate_date <= ?
       )`,
      [targetDate]
    );

    return c.json({
      success: true,
      version: new Date(targetDate * 1000).toISOString(),
      data: {
        law: {
          availableRates: lawRates.length,
          categories: [...new Set(lawRates.map((r: any) => r.variable_code))],
        },
        exchangeRates: {
          available: exchangeRates.length,
          currencies: exchangeRates.map((r: any) => r.variable_code),
        },
        note: 'Use /api/calculator/data?vendorId=xxx to get complete data for calculation',
      },
    });
  } catch (error: any) {
    console.error('Error fetching preview:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch preview',
        },
      },
      500
    );
  }
});


