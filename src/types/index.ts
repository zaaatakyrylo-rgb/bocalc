// Core Types for BOCalc Application

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'admin' | 'vendor' | 'viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  vendorId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  role?: UserRole;
  vendorId?: string;
}

// ============================================================================
// Vendor Types
// ============================================================================

export interface VendorSettings {
  defaultCurrency: 'USD' | 'EUR';
  defaultLanguage: 'ru' | 'uk' | 'en';
  showBranding: boolean;
  customDomain?: string;
  emailNotifications: boolean;
  allowPublicCalculator: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  logoUrl?: string;
  active: boolean;
  settings: VendorSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type VendorRateType = 'auction_fee' | 'service_fee' | 'custom';

export interface VendorRate {
  id: string;
  vendorId: string;
  rateType: VendorRateType;
  name: string;
  description?: string;
  baseValue: number;
  currency: string;
  effectiveAt: Date;
  metadata?: Record<string, any> | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface VendorPort {
  id: string;
  vendorId: string;
  name: string;
  country: string;
  city: string;
  baseOceanShipping: number;
  inlandShipping: number;
  currency: string;
  transitTimeDays?: number;
  metadata?: Record<string, any> | null;
  active: boolean;
  createdAt?: Date;
  updatedAt: Date;
  updatedBy?: string;
}

export interface VendorModifier {
  id: string;
  vendorId: string;
  modifierType: string;
  modifierKey: string;
  oceanShippingModifier: number;
  usaShippingModifier: number;
  fixedAmount: number;
  percentage: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

export interface VersionRecord<TSnapshot> {
  version: number;
  changeType: string;
  changeNotes?: string;
  updatedBy?: string;
  updatedAt: string;
  snapshot: TSnapshot;
}

// ============================================================================
// Calculator Types
// ============================================================================

export type BodyType = 'sedan' | 'suv' | 'truck' | 'van' | 'coupe' | 'wagon' | 'motorcycle';
export type DamageType = 'front' | 'rear' | 'side' | 'all' | 'none';
export type ContainerType = '20ft' | '40ft' | 'roro';

export interface CalculatorInput {
  // Main parameters
  carPrice: number; // USD
  auctionId: string;
  stateOrigin: string;
  portDestination: string;

  // Car characteristics
  bodyType: BodyType;
  year: number;
  isRunning: boolean;

  // Optional parameters
  weight?: number; // lbs
  length?: number; // inches
  hasKeys?: boolean;
  hasDamage?: boolean;
  damageType?: DamageType;

  // Context
  vendorId: string;
  calculateTax?: boolean;
}

export interface FeeBreakdown {
  amount: number;
  formula?: string;
  description: string;
}

export interface AuctionFee extends FeeBreakdown {
  gateFee?: number;
  environmentalFee?: number;
}

export interface USAShipping extends FeeBreakdown {
  distance: number; // miles
  pricePerMile: number;
  baseFee: number;
  modifiers: Array<{
    name: string;
    amount: number;
  }>;
}

export interface OceanShipping extends FeeBreakdown {
  containerType: ContainerType;
  estimatedDays: number;
  portFee: number;
}

export interface CustomsClearance extends FeeBreakdown {
  dutyRate: number; // percentage
  dutyAmount: number;
  customsFee: number;
  brokerFee: number;
}

export interface VendorFees extends FeeBreakdown {
  serviceFee: number;
  documentationFee: number;
  additionalFees: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
}

export interface TaxCalculation extends FeeBreakdown {
  rate: number; // percentage
  taxableAmount: number;
}

export interface CalculationBreakdown {
  auctionFee: AuctionFee;
  usaShipping: USAShipping;
  oceanShipping: OceanShipping;
  customsClearance: CustomsClearance;
  vendorFees: VendorFees;
  tax?: TaxCalculation;
}

export interface CalculationResult {
  id: string;
  breakdown: CalculationBreakdown;
  total: number;
  currency: string;
  calculatedAt: Date;
  validUntil: Date;
  vendorId: string;
  inputData: CalculatorInput;
}

export interface CalculationSummary {
  id: string;
  userId: string;
  vendorId: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export enum AuditAction {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DELETE = 'user_delete',

  VENDOR_CREATE = 'vendor_create',
  VENDOR_UPDATE = 'vendor_update',
  VENDOR_DEACTIVATE = 'vendor_deactivate',

  PRICING_UPDATE = 'pricing_update',
  RULE_CREATE = 'rule_create',
  RULE_UPDATE = 'rule_update',
  RULE_DELETE = 'rule_delete',

  SHEETS_SYNC = 'sheets_sync',
  SHEETS_SYNC_ERROR = 'sheets_sync_error',

  CALCULATION_PERFORMED = 'calculation_performed',
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  vendorId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  changesBefore?: Record<string, any>;
  changesAfter?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

// ============================================================================
// Google Sheets Types
// ============================================================================

export interface SheetVendor {
  vendor_id: string;
  name: string;
  slug: string;
  contact_email: string;
  active: boolean;
  settings_json: string;
  created_at: string;
  updated_at: string;
}

export interface SheetAuction {
  auction_id: string;
  name: string;
  location_state: string;
  buyer_fee_type: 'fixed' | 'percentage' | 'tiered';
  buyer_fee_value: string; // JSON for tiered
  gate_fee: number;
  updated_by: string;
  updated_at: string;
}

export interface SheetPort {
  port_id: string;
  name: string;
  country: string;
  city: string;
  base_ocean_shipping: number;
  vendor_id?: string;
  active: boolean;
  updated_at: string;
}

export interface SheetUSAShipping {
  route_id: string;
  state_from: string;
  port_to: string;
  distance_miles: number;
  base_price: number;
  price_per_mile: number;
  vendor_id?: string;
  updated_at: string;
}

export interface SheetPricingRule {
  rule_id: string;
  vendor_id?: string;
  rule_type: string;
  condition_json: string;
  value: number;
  priority: number;
  active: boolean;
  updated_at: string;
}

export interface SheetBodyTypeModifier {
  modifier_id: string;
  body_type: BodyType;
  ocean_shipping_modifier: number;
  usa_shipping_modifier: number;
  vendor_id?: string;
  updated_at: string;
}

export interface SheetCustomsRate {
  rate_id: string;
  country: string;
  duty_rate: number;
  vat_rate: number;
  base_clearance_fee: number;
  broker_fee: number;
  updated_at: string;
}

export interface SheetsData {
  vendors: SheetVendor[];
  auctions: SheetAuction[];
  ports: SheetPort[];
  usaShipping: SheetUSAShipping[];
  pricingRules: SheetPricingRule[];
  bodyTypeModifiers: SheetBodyTypeModifier[];
  customsRates: SheetCustomsRate[];
  syncedAt: Date;
  version: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Reference Data Types
// ============================================================================

export interface Auction {
  id: string;
  name: string;
  state: string;
  buyerFeeType: 'fixed' | 'percentage' | 'tiered';
  buyerFeeValue: any;
  gateFee: number;
}

export interface Port {
  id: string;
  name: string;
  country: string;
  city: string;
  baseOceanShipping: number;
  active: boolean;
}

export interface USState {
  code: string;
  name: string;
}

// ============================================================================
// Filter & Search Types
// ============================================================================

export interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  vendorId?: string;
  action?: AuditAction;
  resourceType?: string;
  success?: boolean;
}

export interface VendorFilters {
  active?: boolean;
  search?: string;
}

export interface CalculationFilters {
  vendorId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}


