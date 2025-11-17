import * as jose from 'jose';
import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  payload: {
    userId: string;
    email: string;
    role: string;
    vendorId?: string;
  },
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    vendorId: payload.vendorId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

/**
 * Generate JWT refresh token
 */
export async function generateRefreshToken(
  payload: {
    userId: string;
  },
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return await new jose.SignJWT({
    userId: payload.userId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string, secret: string) {
  const secretKey = new TextEncoder().encode(secret);
  return await jose.jwtVerify(token, secretKey);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  return { valid: true };
}

