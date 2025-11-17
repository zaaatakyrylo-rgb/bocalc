/**
 * BOCalc Cloudflare Workers API
 * Main entry point
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRouter } from './handlers/auth';
import { usersRouter } from './handlers/users';
import { vendorsRouter } from './handlers/vendors';
import { calculatorRouter } from './handlers/calculator';
import { sheetsRouter } from './handlers/sheets';
import { auditRouter } from './handlers/audit';
import { referenceRouter } from './handlers/reference';
import {
  vendorRatesRouter,
  vendorPortsRouter,
  vendorModifiersRouter,
} from './handlers/vendor-pricing';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { errorHandler } from './middleware/error-handler';

// Cloudflare Workers environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_SHEETS_ID: string;
  ADMIN_EMAIL: string;
  ENVIRONMENT: string;
}

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'https://bocalc.pages.dev',
]);

const resolveCorsOrigin = (origin: string | undefined) => {
  if (!origin) {
    return origin;
  }

  if (allowedOrigins.has(origin) || origin.endsWith('.pages.dev')) {
    return origin;
  }

  return 'https://bocalc.pages.dev';
};

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
    credentials: true,
  }),
);
app.use('*', rateLimitMiddleware);

// Error handler
app.onError(errorHandler);

// Health check
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

// API Routes
app.route('/api/auth', authRouter);
app.route('/api/users', usersRouter);
app.route('/api/vendors', vendorsRouter);
app.route('/api/vendor-rates', vendorRatesRouter);
app.route('/api/vendor-ports', vendorPortsRouter);
app.route('/api/vendor-modifiers', vendorModifiersRouter);
app.route('/api/calculate', calculatorRouter);
app.route('/api/sheets', sheetsRouter);
app.route('/api/audit', auditRouter);
app.route('/api/reference', referenceRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ 
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    }
  }, 404);
});

// Cron trigger for Google Sheets sync
export default {
  fetch: app.fetch,
  
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Auto-sync Google Sheets every 5 minutes
    console.log('Running scheduled Google Sheets sync');
    
    try {
      // Import and run sync
      const { syncGoogleSheets } = await import('./services/sheets-service');
      await syncGoogleSheets(env);
      console.log('Google Sheets sync completed successfully');
    } catch (error) {
      console.error('Google Sheets sync failed:', error);
    }
  },
};

