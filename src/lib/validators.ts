import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_REGEX } from './constants';

// ============================================================================
// Authentication Validators
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['admin', 'vendor', 'viewer']).optional(),
  vendorId: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(
      PASSWORD_REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// User Validators
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_REGEX, 'Password must meet requirements'),
  role: z.enum(['admin', 'vendor', 'viewer']),
  vendorId: z.string().optional(),
  active: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_REGEX, 'Password must meet requirements')
    .optional(),
  role: z.enum(['admin', 'vendor', 'viewer']).optional(),
  vendorId: z.string().optional(),
  active: z.boolean().optional(),
});

// ============================================================================
// Vendor Validators
// ============================================================================

export const vendorSettingsSchema = z.object({
  defaultCurrency: z.enum(['USD', 'EUR']).default('USD'),
  defaultLanguage: z.enum(['ru', 'uk', 'en']).default('ru'),
  showBranding: z.boolean().default(true),
  customDomain: z.string().optional(),
  emailNotifications: z.boolean().default(true),
  allowPublicCalculator: z.boolean().default(true),
});

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  logoUrl: z.string().url('Invalid URL').optional(),
  active: z.boolean().default(true),
  settings: vendorSettingsSchema,
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  contactEmail: z.string().email('Invalid email address').optional(),
  contactPhone: z.string().optional(),
  logoUrl: z.string().url('Invalid URL').optional(),
  active: z.boolean().optional(),
  settings: vendorSettingsSchema.optional(),
});

// ============================================================================
// Calculator Validators
// ============================================================================

export const calculatorInputSchema = z.object({
  // Main parameters
  carPrice: z
    .number()
    .min(1, 'Car price must be at least $1')
    .max(1000000, 'Car price cannot exceed $1,000,000'),
  auctionId: z.string().min(1, 'Auction is required'),
  stateOrigin: z.string().length(2, 'State must be a 2-letter code'),
  portDestination: z.string().min(1, 'Destination port is required'),

  // Car characteristics
  bodyType: z.enum(['sedan', 'suv', 'truck', 'van', 'coupe', 'wagon', 'motorcycle']),
  year: z
    .number()
    .min(1900, 'Year must be at least 1900')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  isRunning: z.boolean(),

  // Optional parameters
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  hasKeys: z.boolean().optional(),
  hasDamage: z.boolean().optional(),
  damageType: z.enum(['front', 'rear', 'side', 'all', 'none']).optional(),

  // Context
  vendorId: z.string().min(1, 'Vendor is required'),
  calculateTax: z.boolean().optional(),
});

// ============================================================================
// Query Parameter Validators
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  role: z.enum(['admin', 'vendor', 'viewer']).optional(),
  vendorId: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export const vendorListQuerySchema = z.object({
  active: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const calculationListQuerySchema = paginationSchema.extend({
  vendorId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export const auditLogQuerySchema = paginationSchema.extend({
  userId: z.string().optional(),
  vendorId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  success: z.coerce.boolean().optional(),
});

// ============================================================================
// Helper Types (inferred from schemas)
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

export type CalculatorInputValidated = z.infer<typeof calculatorInputSchema>;

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type VendorListQuery = z.infer<typeof vendorListQuerySchema>;
export type CalculationListQuery = z.infer<typeof calculationListQuerySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;


