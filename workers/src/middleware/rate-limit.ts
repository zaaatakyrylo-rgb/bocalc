import { Context, Next } from 'hono';
import { Env } from '../index';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Simple rate limiting middleware using KV
 */
export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Get client IP
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const key = `rate-limit:${ip}`;

  try {
    // Get current count from KV
    const data = await c.env.CACHE.get(key);
    const count = data ? parseInt(data) : 0;

    if (count >= RATE_LIMIT_MAX_REQUESTS) {
      return c.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      }, 429);
    }

    // Increment counter
    await c.env.CACHE.put(
      key,
      (count + 1).toString(),
      { expirationTtl: Math.ceil(RATE_LIMIT_WINDOW / 1000) }
    );

    await next();
  } catch (error) {
    // If rate limiting fails, allow the request
    console.error('Rate limiting error:', error);
    await next();
  }
}

