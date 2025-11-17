import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';
import { query, queryOne, execute, generateId, now } from '../utils/db';
import { recordVendorVersion } from '../utils/versioning';

export const vendorsRouter = new Hono<{ Bindings: Env }>();

/**
 * GET /api/vendors
 * List vendors (public endpoint with optional auth)
 */
vendorsRouter.get('/', async (c) => {
  try {
    const vendors = await query(
      c.env.DB,
      'SELECT id, name, slug, contact_email, contact_phone, logo_url, active, settings, created_at, updated_at FROM vendors WHERE active = 1 ORDER BY name'
    );

    return c.json({
      success: true,
      data: vendors.map((v: any) => ({
        id: v.id,
        name: v.name,
        slug: v.slug,
        contactEmail: v.contact_email,
        contactPhone: v.contact_phone,
        logoUrl: v.logo_url,
        active: v.active === 1,
        settings: JSON.parse(v.settings),
        createdAt: new Date(v.created_at * 1000).toISOString(),
        updatedAt: new Date(v.updated_at * 1000).toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('List vendors error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch vendors',
      },
    }, 500);
  }
});

/**
 * GET /api/vendors/:id
 * Get vendor by ID
 */
vendorsRouter.get('/:id', async (c) => {
  try {
    const vendorId = c.req.param('id');

    const vendor = await queryOne<any>(
      c.env.DB,
      'SELECT * FROM vendors WHERE id = ? OR slug = ?',
      [vendorId, vendorId]
    );

    if (!vendor) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Vendor not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        contactEmail: vendor.contact_email,
        contactPhone: vendor.contact_phone,
        logoUrl: vendor.logo_url,
        active: vendor.active === 1,
        settings: JSON.parse(vendor.settings),
        createdAt: new Date(vendor.created_at * 1000).toISOString(),
        updatedAt: new Date(vendor.updated_at * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get vendor error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch vendor',
      },
    }, 500);
  }
});

/**
 * POST /api/vendors
 * Create vendor (admin only)
 */
vendorsRouter.post('/', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const currentUser = c.get('user');
    const { name, slug, contactEmail, contactPhone, logoUrl, settings } = await c.req.json();

    // Validate input
    if (!name || !slug || !contactEmail) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, slug, and contactEmail are required',
        },
      }, 400);
    }

    // Check if slug exists
    const existing = await queryOne(c.env.DB, 'SELECT id FROM vendors WHERE slug = ?', [slug]);
    if (existing) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Slug already exists',
        },
      }, 400);
    }

    // Create vendor
    const vendorId = generateId('vendor');
    const defaultSettings = {
      defaultCurrency: 'USD',
      defaultLanguage: 'ru',
      showBranding: true,
      emailNotifications: true,
      allowPublicCalculator: true,
      ...settings,
    };

    await execute(
      c.env.DB,
      'INSERT INTO vendors (id, name, slug, contact_email, contact_phone, logo_url, active, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        vendorId,
        name,
        slug,
        contactEmail,
        contactPhone || null,
        logoUrl || null,
        1,
        JSON.stringify(defaultSettings),
        now(),
        now(),
      ]
    );

    await recordVendorVersion(c.env, vendorId, {
      snapshot: {
        id: vendorId,
        name,
        slug,
        contactEmail,
        contactPhone: contactPhone || null,
        logoUrl: logoUrl || null,
        active: true,
        settings: defaultSettings,
      },
      changeType: 'create',
      updatedBy: currentUser?.id,
    });

    return c.json({
      success: true,
      data: {
        id: vendorId,
        name,
        slug,
        contactEmail,
        contactPhone: contactPhone || null,
        logoUrl: logoUrl || null,
        active: true,
        settings: defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, 201);
  } catch (error: any) {
    console.error('Create vendor error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create vendor',
      },
    }, 500);
  }
});

/**
 * PATCH /api/vendors/:id
 * Update vendor (admin or vendor owner)
 */
vendorsRouter.patch('/:id', authMiddleware, async (c) => {
  try {
    const vendorId = c.req.param('id');
    const currentUser = c.get('user');
    const { name, slug, contactEmail, contactPhone, logoUrl, active, settings } = await c.req.json();

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.vendorId !== vendorId) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (slug && currentUser.role === 'admin') {
      updates.push('slug = ?');
      params.push(slug);
    }

    if (contactEmail) {
      updates.push('contact_email = ?');
      params.push(contactEmail);
    }

    if (contactPhone !== undefined) {
      updates.push('contact_phone = ?');
      params.push(contactPhone);
    }

    if (logoUrl !== undefined) {
      updates.push('logo_url = ?');
      params.push(logoUrl);
    }

    if (active !== undefined && currentUser.role === 'admin') {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (settings) {
      updates.push('settings = ?');
      params.push(JSON.stringify(settings));
    }

    updates.push('updated_at = ?');
    params.push(now());

    params.push(vendorId);

    await execute(
      c.env.DB,
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const updatedVendor = await queryOne<any>(
      c.env.DB,
      'SELECT * FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (updatedVendor) {
      await recordVendorVersion(c.env, vendorId, {
        snapshot: updatedVendor,
        changeType: 'update',
        updatedBy: currentUser?.id,
      });
    }

    return c.json({
      success: true,
      data: {
        message: 'Vendor updated successfully',
      },
    });
  } catch (error: any) {
    console.error('Update vendor error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update vendor',
      },
    }, 500);
  }
});

/**
 * DELETE /api/vendors/:id
 * Delete vendor (admin only)
 */
vendorsRouter.delete('/:id', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const vendorId = c.req.param('id');
    const currentUser = c.get('user');

    // Soft delete (deactivate)
    await execute(c.env.DB, 'UPDATE vendors SET active = 0, updated_at = ? WHERE id = ?', [
      now(),
      vendorId,
    ]);

    const vendor = await queryOne<any>(c.env.DB, 'SELECT * FROM vendors WHERE id = ?', [vendorId]);
    if (vendor) {
      await recordVendorVersion(c.env, vendorId, {
        snapshot: vendor,
        changeType: 'deactivate',
        updatedBy: currentUser?.id,
      });
    }

    return c.json({
      success: true,
      data: {
        message: 'Vendor deactivated successfully',
      },
    });
  } catch (error: any) {
    console.error('Delete vendor error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete vendor',
      },
    }, 500);
  }
});

vendorsRouter.get('/:id/versions', authMiddleware, async (c) => {
  try {
    const vendorId = c.req.param('id');
    const currentUser = c.get('user');

    if (!recordAccess(currentUser, vendorId)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    const versions = await query(
      c.env.DB,
      `SELECT version, snapshot, change_type, change_notes, updated_by, updated_at
       FROM vendor_versions
       WHERE vendor_id = ?
       ORDER BY version DESC`,
      [vendorId]
    );

    return c.json({
      success: true,
      data: versions.map((v: any) => ({
        version: v.version,
        changeType: v.change_type,
        changeNotes: v.change_notes,
        updatedBy: v.updated_by,
        updatedAt: new Date(v.updated_at * 1000).toISOString(),
        snapshot: JSON.parse(v.snapshot),
      })),
    });
  } catch (error: any) {
    console.error('Vendor versions error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load versions',
      },
    }, 500);
  }
});

vendorsRouter.post('/:id/versions/:version/restore', authMiddleware, requireRole('admin'), async (c) => {
  try {
    const vendorId = c.req.param('id');
    const versionNumber = Number(c.req.param('version'));
    const currentUser = c.get('user');

    const versionRow = await queryOne<any>(
      c.env.DB,
      `SELECT * FROM vendor_versions WHERE vendor_id = ? AND version = ?`,
      [vendorId, versionNumber]
    );

    if (!versionRow) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Version not found',
        },
      }, 404);
    }

    const snapshot = JSON.parse(versionRow.snapshot);
    await execute(
      c.env.DB,
      `UPDATE vendors
       SET name = ?, slug = ?, contact_email = ?, contact_phone = ?, logo_url = ?, active = ?, settings = ?, updated_at = ?
       WHERE id = ?`,
      [
        snapshot.name,
        snapshot.slug,
        snapshot.contact_email,
        snapshot.contact_phone,
        snapshot.logo_url,
        snapshot.active,
        snapshot.settings,
        now(),
        vendorId,
      ]
    );

    await recordVendorVersion(c.env, vendorId, {
      snapshot: snapshot,
      changeType: 'update',
      updatedBy: currentUser?.id,
      changeNotes: `Restored version ${versionNumber}`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Restore vendor version error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to restore version',
      },
    }, 500);
  }
});

function recordAccess(user: any, vendorId: string) {
  return user.role === 'admin' || user.vendorId === vendorId;
}

