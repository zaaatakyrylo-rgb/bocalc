import { Context } from 'hono';
import { Env } from '../index';

/**
 * Global error handler
 */
export function errorHandler(err: Error, c: Context<{ Bindings: Env }>) {
  console.error('Error:', err);

  // Check for specific error types
  if (err.message.includes('UNAUTHORIZED')) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }, 401);
  }

  if (err.message.includes('FORBIDDEN')) {
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
    }, 403);
  }

  if (err.message.includes('NOT_FOUND')) {
    return c.json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    }, 404);
  }

  if (err.message.includes('VALIDATION_ERROR')) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    }, 400);
  }

  // Generic error
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: c.env.ENVIRONMENT === 'production' 
        ? 'An internal error occurred' 
        : err.message,
      details: c.env.ENVIRONMENT === 'production' ? undefined : err.stack,
    },
  }, 500);
}

