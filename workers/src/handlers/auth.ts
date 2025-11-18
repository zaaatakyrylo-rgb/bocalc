import { Hono } from 'hono';
import { Env } from '../index';
import { query, queryOne, execute, generateId, now } from '../utils/db';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  isValidEmail,
  isValidPassword,
} from '../utils/auth';

export const authRouter = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/login
 * User login
 */
authRouter.post('/login', async (c) => {
  try {
    console.log('Login attempt started');
    const { email, password } = await c.req.json();
    console.log('Email:', email);

    // Validate input
    if (!email || !password) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      }, 400);
    }

    // Find user
    const user = await queryOne<any>(
      c.env.DB,
      'SELECT * FROM users WHERE email = ? AND active = 1',
      [email]
    );

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, 401);
    }

    // Verify password
    console.log('Verifying password for user:', email);
    console.log('Stored hash:', user.password_hash);
    const isValid = await verifyPassword(password, user.password_hash);
    console.log('Password valid:', isValid);
    if (!isValid) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      }, 401);
    }

    // Generate tokens
    const accessToken = await generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        vendorId: user.vendor_id,
      },
      c.env.JWT_SECRET
    );

    const refreshToken = await generateRefreshToken(
      { userId: user.id },
      c.env.JWT_SECRET
    );

    // Store refresh token in database
    const tokenHash = await hashPassword(refreshToken);
    await execute(
      c.env.DB,
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId('rt'), user.id, tokenHash, now() + 7 * 24 * 60 * 60, now()]
    );

    // Log audit event
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';
    
    await execute(
      c.env.DB,
      `INSERT INTO audit_logs (id, timestamp, user_id, user_email, user_role, vendor_id, action, 
       resource_type, resource_id, ip_address, user_agent, success) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('audit'),
        now(),
        user.id,
        user.email,
        user.role,
        user.vendor_id,
        'user_login',
        'user',
        user.id,
        ip,
        userAgent,
        1,
      ]
    );

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          vendorId: user.vendor_id,
          active: user.active === 1,
          createdAt: new Date(user.created_at * 1000).toISOString(),
          updatedAt: new Date(user.updated_at * 1000).toISOString(),
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900, // 15 minutes in seconds
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Login failed',
        details: error.toString(),
      },
    }, 500);
  }
});

/**
 * POST /api/auth/register
 * User registration
 */
authRouter.post('/register', async (c) => {
  try {
    const { email, password, role, vendorId } = await c.req.json();

    // Validate input
    if (!email || !password) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      }, 400);
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return c.json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message,
        },
      }, 400);
    }

    // Check if email already exists
    const existingUser = await queryOne(
      c.env.DB,
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return c.json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already registered',
        },
      }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = generateId('user');
    const userRole = role || 'viewer';

    await execute(
      c.env.DB,
      'INSERT INTO users (id, email, password_hash, role, vendor_id, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, userRole, vendorId || null, 1, now(), now()]
    );

    // Generate tokens
    const accessToken = await generateAccessToken(
      {
        userId,
        email,
        role: userRole,
        vendorId,
      },
      c.env.JWT_SECRET
    );

    const refreshToken = await generateRefreshToken(
      { userId },
      c.env.JWT_SECRET
    );

    // Store refresh token
    const tokenHash = await hashPassword(refreshToken);
    await execute(
      c.env.DB,
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId('rt'), userId, tokenHash, now() + 7 * 24 * 60 * 60, now()]
    );

    return c.json({
      success: true,
      data: {
        user: {
          id: userId,
          email,
          role: userRole,
          vendorId: vendorId || null,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 900,
        },
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed',
      },
    }, 500);
  }
});

/**
 * POST /api/auth/logout
 * User logout (revoke refresh token)
 */
authRouter.post('/logout', async (c) => {
  // In a real implementation, we would revoke the refresh token
  // For now, client-side logout is sufficient
  return c.json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
authRouter.post('/refresh', async (c) => {
  try {
    const { refreshToken } = await c.req.json();

    if (!refreshToken) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
        },
      }, 400);
    }

    // Verify refresh token (this is a simplified version)
    // In production, check against stored token hash
    
    return c.json({
      success: true,
      data: {
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900,
        },
      },
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      },
    }, 500);
  }
});

