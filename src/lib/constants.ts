/**
 * Application Constants
 */

// Supported locales
export const locales = ['en', 'ru', 'uk'] as const;
export const LOCALES = locales;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

// Locale names
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
};

// Currency
export const DEFAULT_CURRENCY = 'USD';
export const CURRENCIES = ['USD', 'EUR'] as const;

// User roles
export const USER_ROLES = ['admin', 'vendor', 'viewer'] as const;

// Body types
export const BODY_TYPES = [
  'sedan',
  'suv',
  'truck',
  'van',
  'coupe',
  'wagon',
  'motorcycle',
] as const;

// Body type translations
export const BODY_TYPE_LABELS: Record<string, Record<Locale, string>> = {
  sedan: { en: 'Sedan', ru: 'Седан', uk: 'Седан' },
  suv: { en: 'SUV', ru: 'Внедорожник', uk: 'Позашляховик' },
  truck: { en: 'Truck', ru: 'Пикап', uk: 'Пікап' },
  van: { en: 'Van', ru: 'Фургон', uk: 'Фургон' },
  coupe: { en: 'Coupe', ru: 'Купе', uk: 'Купе' },
  wagon: { en: 'Wagon', ru: 'Универсал', uk: 'Універсал' },
  motorcycle: { en: 'Motorcycle', ru: 'Мотоцикл', uk: 'Мотоцикл' },
};

// Damage types
export const DAMAGE_TYPES = ['none', 'front', 'rear', 'side', 'all'] as const;

// Container types
export const CONTAINER_TYPES = ['20ft', '40ft', 'roro'] as const;

// US States
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// Auction names
export const AUCTION_NAMES = ['Copart', 'IAAI', 'Manheim'];

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  users: {
    list: '/api/users',
    get: (id: string) => `/api/users/${id}`,
    create: '/api/users',
    update: (id: string) => `/api/users/${id}`,
    delete: (id: string) => `/api/users/${id}`,
  },
  vendors: {
    list: '/api/vendors',
    get: (id: string) => `/api/vendors/${id}`,
    create: '/api/vendors',
    update: (id: string) => `/api/vendors/${id}`,
    delete: (id: string) => `/api/vendors/${id}`,
  },
  calculator: {
    calculate: '/api/calculate',
    get: (id: string) => `/api/calculate/${id}`,
    history: '/api/calculate/history',
  },
  sheets: {
    sync: '/api/sheets/sync',
    status: '/api/sheets/status',
    versions: '/api/sheets/versions',
  },
  audit: {
    list: '/api/audit',
    get: (id: string) => `/api/audit/${id}`,
    export: '/api/audit/export',
  },
  reference: {
    auctions: '/api/reference/auctions',
    ports: '/api/reference/ports',
    states: '/api/reference/states',
    bodyTypes: '/api/reference/body-types',
  },
};

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const TIME_FORMAT = 'HH:mm';

// Calculation validity (days)
export const CALCULATION_VALIDITY_DAYS = 30;

// Google Sheets sync interval (minutes)
export const SHEETS_SYNC_INTERVAL = 5;

// Cache TTL (seconds)
export const CACHE_TTL = {
  sheets: 300, // 5 minutes
  reference: 3600, // 1 hour
  user: 900, // 15 minutes
};

// JWT expiry
export const JWT_EXPIRY = {
  access: '15m',
  refresh: '7d',
};

// Security
export const BCRYPT_ROUNDS = 12;
export const RATE_LIMIT = {
  requests: 100,
  window: 60000, // 1 minute
};

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// File upload
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  SYNC_ERROR: 'SYNC_ERROR',
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in',
  LOGOUT: 'Successfully logged out',
  REGISTER: 'Successfully registered',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  VENDOR_CREATED: 'Vendor created successfully',
  VENDOR_UPDATED: 'Vendor updated successfully',
  VENDOR_DELETED: 'Vendor deactivated successfully',
  PASSWORD_RESET_SENT: 'Password reset link sent',
  PASSWORD_RESET: 'Password reset successfully',
  SYNC_STARTED: 'Sync started successfully',
  CALCULATION_SAVED: 'Calculation saved successfully',
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'bocalc_auth_token',
  REFRESH_TOKEN: 'bocalc_refresh_token',
  USER: 'bocalc_user',
  LOCALE: 'bocalc_locale',
  THEME: 'bocalc_theme',
  CALCULATIONS: 'bocalc_calculations',
};

// Theme
export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

// Chart colors
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

// Status colors
export const STATUS_COLORS = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
};

// Badge variants
export const BADGE_VARIANTS = {
  admin: 'bg-red-100 text-red-800',
  vendor: 'bg-blue-100 text-blue-800',
  viewer: 'bg-gray-100 text-gray-800',
};


