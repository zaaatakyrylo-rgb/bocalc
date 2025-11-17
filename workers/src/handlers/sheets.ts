import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware, requireRole } from '../middleware/auth';

export const sheetsRouter = new Hono<{ Bindings: Env }>();

// All routes require admin authentication
sheetsRouter.use('*', authMiddleware, requireRole('admin'));

/**
 * POST /api/sheets/sync
 * Trigger manual Google Sheets sync
 */
sheetsRouter.post('/sync', async (c) => {
  try {
    const { syncGoogleSheets } = await import('../services/sheets-service');
    await syncGoogleSheets(c.env);

    return c.json({
      success: true,
      data: {
        message: 'Google Sheets sync completed successfully',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Manual sync error:', error);
    return c.json({
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message: error.message || 'Sync failed',
      },
    }, 500);
  }
});

/**
 * GET /api/sheets/status
 * Get sync status
 */
sheetsRouter.get('/status', async (c) => {
  try {
    const lastSync = await c.env.CACHE.get('sheets:last_sync');
    const syncStatus = await c.env.CACHE.get('sheets:sync_status');

    return c.json({
      success: true,
      data: {
        lastSync: lastSync ? new Date(parseInt(lastSync)).toISOString() : null,
        status: syncStatus || 'unknown',
        nextSync: 'Auto-sync every 5 minutes',
      },
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch sync status',
      },
    }, 500);
  }
});

/**
 * GET /api/sheets/versions
 * Get sync version history
 */
sheetsRouter.get('/versions', async (c) => {
  try {
    // This would return version history from sheets_cache table
    return c.json({
      success: true,
      data: {
        versions: [],
        message: 'Version history feature coming soon',
      },
    });
  } catch (error: any) {
    console.error('Get versions error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch versions',
      },
    }, 500);
  }
});

