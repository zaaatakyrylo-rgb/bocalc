import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';
import { query } from '../utils/db';

export const auditRouter = new Hono<{ Bindings: Env }>();

// All routes require authentication
auditRouter.use('*', authMiddleware);

/**
 * GET /api/audit
 * List audit logs
 */
auditRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    
    // Build query based on role
    let sql = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    
    if (user.role === 'vendor') {
      // Vendors can only see their own logs
      sql += ' WHERE vendor_id = ?';
      params.push(user.vendorId);
    } else if (user.role === 'viewer') {
      // Viewers can only see their own actions
      sql += ' WHERE user_id = ?';
      params.push(user.id);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT 100';

    const logs = await query(c.env.DB, sql, params);

    return c.json({
      success: true,
      data: logs.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.timestamp * 1000).toISOString(),
        userId: log.user_id,
        userEmail: log.user_email,
        userRole: log.user_role,
        vendorId: log.vendor_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        changesBefore: log.changes_before ? JSON.parse(log.changes_before) : null,
        changesAfter: log.changes_after ? JSON.parse(log.changes_after) : null,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        success: log.success === 1,
        errorMessage: log.error_message,
      })),
    });
  } catch (error: any) {
    console.error('List audit logs error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit logs',
      },
    }, 500);
  }
});

/**
 * GET /api/audit/:id
 * Get audit log by ID
 */
auditRouter.get('/:id', async (c) => {
  try {
    const logId = c.req.param('id');
    const user = c.get('user');

    const logs = await query(c.env.DB, 'SELECT * FROM audit_logs WHERE id = ?', [logId]);

    if (!logs || logs.length === 0) {
      return c.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Audit log not found',
        },
      }, 404);
    }

    const log = logs[0] as any;

    // Check permissions
    if (user.role === 'vendor' && log.vendor_id !== user.vendorId) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    if (user.role === 'viewer' && log.user_id !== user.id) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      }, 403);
    }

    return c.json({
      success: true,
      data: {
        id: log.id,
        timestamp: new Date(log.timestamp * 1000).toISOString(),
        userId: log.user_id,
        userEmail: log.user_email,
        userRole: log.user_role,
        vendorId: log.vendor_id,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        changesBefore: log.changes_before ? JSON.parse(log.changes_before) : null,
        changesAfter: log.changes_after ? JSON.parse(log.changes_after) : null,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        success: log.success === 1,
        errorMessage: log.error_message,
      },
    });
  } catch (error: any) {
    console.error('Get audit log error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch audit log',
      },
    }, 500);
  }
});

/**
 * GET /api/audit/export
 * Export audit logs
 */
auditRouter.get('/export', requireRole('admin'), async (c) => {
  try {
    // This would export logs in various formats (CSV, JSON)
    // For now, just return JSON
    const logs = await query(
      c.env.DB,
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'
    );

    return c.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export audit logs',
      },
    }, 500);
  }
});

