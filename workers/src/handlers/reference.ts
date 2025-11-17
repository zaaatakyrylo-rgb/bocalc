import { Hono } from 'hono';
import { Env } from '../index';

export const referenceRouter = new Hono<{ Bindings: Env }>();

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const BODY_TYPES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'wagon', label: 'Wagon' },
  { value: 'motorcycle', label: 'Motorcycle' },
];

/**
 * GET /api/reference/states
 * Get list of US states
 */
referenceRouter.get('/states', (c) => {
  return c.json({
    success: true,
    data: US_STATES,
  });
});

/**
 * GET /api/reference/body-types
 * Get list of body types
 */
referenceRouter.get('/body-types', (c) => {
  return c.json({
    success: true,
    data: BODY_TYPES,
  });
});

/**
 * GET /api/reference/auctions
 * Get list of auctions (from cache/database)
 */
referenceRouter.get('/auctions', async (c) => {
  try {
    // Try to get from cache first
    const cached = await c.env.CACHE.get('sheets:auctions', 'json');
    
    if (cached) {
      return c.json({
        success: true,
        data: cached,
      });
    }

    // Fallback to default auctions
    const defaultAuctions = [
      { id: 'copart', name: 'Copart', state: 'Various' },
      { id: 'iaai', name: 'IAAI', state: 'Various' },
      { id: 'manheim', name: 'Manheim', state: 'Various' },
    ];

    return c.json({
      success: true,
      data: defaultAuctions,
    });
  } catch (error: any) {
    console.error('Get auctions error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch auctions',
      },
    }, 500);
  }
});

/**
 * GET /api/reference/ports
 * Get list of ports (from cache/database)
 */
referenceRouter.get('/ports', async (c) => {
  try {
    // Try to get from cache first
    const cached = await c.env.CACHE.get('sheets:ports', 'json');
    
    if (cached) {
      return c.json({
        success: true,
        data: cached,
      });
    }

    // Fallback to default ports
    const defaultPorts = [
      { id: 'port-odessa', name: 'Port of Odessa', country: 'Ukraine', city: 'Odessa' },
      { id: 'port-riga', name: 'Port of Riga', country: 'Latvia', city: 'Riga' },
      { id: 'port-poti', name: 'Port of Poti', country: 'Georgia', city: 'Poti' },
    ];

    return c.json({
      success: true,
      data: defaultPorts,
    });
  } catch (error: any) {
    console.error('Get ports error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch ports',
      },
    }, 500);
  }
});

