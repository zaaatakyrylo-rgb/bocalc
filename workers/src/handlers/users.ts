import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';
import { query, queryOne, execute, generateId, now } from '../utils/db';
import { hashPassword } from '../utils/auth';
import { recordUserVersion } from '../utils/versioning';

export const usersRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
usersRouter.use('*', authMiddleware);

/**
 * GET /api/users
 * List users (admin only)
 */
usersRouter.get('/', requireRole('admin'), async (c) => {
  try {
    const users = await query(
      c.env.DB,
      `SELECT u.id, u.email, u.role, u.vendor_id, u.active, u.created_at, u.updated_at, 
              v.name as vendor_name
       FROM users u
       LEFT JOIN vendors v ON u.vendor_id = v.id
       ORDER BY u.created_at DESC`
    );

    return c.json({
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        vendorId: u.vendor_id,
        vendorName: u.vendor_name,
        active: u.active === 1,
        createdAt: new Date(u.created_at * 1000).toISOString(),
        updatedAt: new Date(u.updated_at * 1000).toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('List users error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch users',
      },
    }, 500);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
usersRouter.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user');

    // Users can only view their own profile unless they're admin
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    const user = await queryOne<any>(
      c.env.DB,
      `SELECT u.id, u.email, u.role, u.vendor_id, u.active, u.created_at, u.updated_at,
              v.name as vendor_name
       FROM users u
       LEFT JOIN vendors v ON u.vendor_id = v.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        vendorId: user.vendor_id,
        vendorName: user.vendor_name,
        active: user.active === 1,
        createdAt: new Date(user.created_at * 1000).toISOString(),
        updatedAt: new Date(user.updated_at * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user',
      },
    }, 500);
  }
});

/**
 * POST /api/users
 * Create user (admin only)
 */
usersRouter.post('/', requireRole('admin'), async (c) => {
  try {
    const { email, password, role, vendorId, active } = await c.req.json();

    // Validate input
    if (!email || !password || !role) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email, password, and role are required',
        },
      }, 400);
    }

    // Check if email exists
    const existing = await queryOne(c.env.DB, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already exists',
        },
      }, 400);
    }

    // Create user
    const userId = generateId('user');
    const passwordHash = await hashPassword(password);

    const timestamp = now();
    await execute(
      c.env.DB,
      'INSERT INTO users (id, email, password_hash, role, vendor_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, role, vendorId || null, active !== false ? 1 : 0, timestamp, timestamp]
    );

    await recordUserVersion(c.env, userId, {
      snapshot: {
        id: userId,
        email,
        role,
        vendor_id: vendorId || null,
        active: active !== false ? 1 : 0,
        created_at: timestamp,
        updated_at: timestamp,
      },
      changeType: 'create',
      updatedBy: c.get('user')?.id,
    });

    return c.json({
      success: true,
      data: {
        id: userId,
        email,
        role,
        vendorId: vendorId || null,
        active: active !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, 201);
  } catch (error: any) {
    console.error('Create user error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user',
      },
    }, 500);
  }
});

/**
 * PATCH /api/users/:id
 * Update user
 */
usersRouter.patch('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const currentUser = c.get('user');
    const { email, password, role, vendorId, active } = await c.req.json();

    // Users can only update their own profile unless they're admin
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (email) {
      updates.push('email = ?');
      params.push(email);
    }

    if (password) {
      updates.push('password_hash = ?');
      params.push(await hashPassword(password));
    }

    if (role && currentUser.role === 'admin') {
      updates.push('role = ?');
      params.push(role);
    }

    if (vendorId !== undefined && currentUser.role === 'admin') {
      updates.push('vendor_id = ?');
      params.push(vendorId);
    }

    if (active !== undefined && currentUser.role === 'admin') {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    updates.push('updated_at = ?');
    params.push(now());

    params.push(userId);

    await execute(
      c.env.DB,
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (snapshot) {
      await recordUserVersion(c.env, userId, {
        snapshot,
        changeType: 'update',
        updatedBy: currentUser.id,
      });
    }

    return c.json({
      success: true,
      data: {
        message: 'User updated successfully',
      },
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user',
      },
    }, 500);
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
usersRouter.delete('/:id', requireRole('admin'), async (c) => {
  try {
    const userId = c.req.param('id');

    const snapshot = await queryOne<any>(c.env.DB, 'SELECT * FROM users WHERE id = ?', [userId]);
    if (!snapshot) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      }, 404);
    }

    await execute(
      c.env.DB,
      'UPDATE users SET active = 0, updated_at = ? WHERE id = ?',
      [now(), userId]
    );

    await recordUserVersion(c.env, userId, {
      snapshot: { ...snapshot, active: 0 },
      changeType: 'deactivate',
      updatedBy: c.get('user')?.id,
    });

    return c.json({
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user',
      },
    }, 500);
  }
});

usersRouter.get('/:id/versions', requireRole('admin'), async (c) => {
  try {
    const userId = c.req.param('id');

    const versions = await query(
      c.env.DB,
      `SELECT version, snapshot, change_type, updated_by, updated_at
       FROM user_versions
       WHERE user_id = ?
       ORDER BY version DESC`,
      [userId]
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
    console.error('List user versions error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to load versions',
      },
    }, 500);
  }
});

usersRouter.post('/:id/versions/:version/restore', requireRole('admin'), async (c) => {
  try {
    const userId = c.req.param('id');
    const versionNumber = Number(c.req.param('version'));

    const versionRow = await queryOne<any>(
      c.env.DB,
      `SELECT * FROM user_versions WHERE user_id = ? AND version = ?`,
      [userId, versionNumber]
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
      `UPDATE users
       SET email = ?, role = ?, vendor_id = ?, active = ?, updated_at = ?
       WHERE id = ?`,
      [
        snapshot.email,
        snapshot.role,
        snapshot.vendor_id,
        snapshot.active,
        now(),
        userId,
      ]
    );

    await recordUserVersion(c.env, userId, {
      snapshot,
      changeType: 'reactivate',
      updatedBy: c.get('user')?.id,
      changeNotes: `Restored version ${versionNumber}`,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Restore user version error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to restore version',
      },
    }, 500);
  }
});

