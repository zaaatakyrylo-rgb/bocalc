import { Context, Next } from 'hono';
import { Env } from '../index';
import * as jose from 'jose';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'vendor' | 'viewer';
  vendorId?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user to context
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header',
      },
    }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);

    // Add user to context
    c.set('user', {
      id: payload.userId as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'vendor' | 'viewer',
      vendorId: payload.vendorId as string | undefined,
    });

    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    }, 401);
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(...allowedRoles: Array<'admin' | 'vendor' | 'viewer'>) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
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

    if (!allowedRoles.includes(user.role)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      }, 403);
    }

    await next();
  };
}

/**
 * Optional authentication middleware
 * Adds user to context if token is present, but doesn't require it
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jose.jwtVerify(token, secret);

      c.set('user', {
        id: payload.userId as string,
        email: payload.email as string,
        role: payload.role as 'admin' | 'vendor' | 'viewer',
        vendorId: payload.vendorId as string | undefined,
      });
    } catch (error) {
      // Token is invalid, but we don't fail - just continue without user
    }
  }

  await next();
}

