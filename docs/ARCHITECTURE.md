# BOCalc Architecture Documentation

## 🏗️ System Overview

BOCalc is a multi-vendor car shipping calculator platform built on Cloudflare's edge infrastructure for global performance and scalability.

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare CDN (Global Edge)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Next.js Pages│  │  Static      │  │   Workers    │      │
│  │  (React)     │  │  Assets      │  │   API        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────┬─────────────────────────┬───────────────┘
                    │                         │
                    ↓                         ↓
         ┌──────────────────┐    ┌──────────────────────┐
         │ Cloudflare Pages │    │ Cloudflare Workers   │
         │   (Frontend)     │    │    (Backend API)     │
         └──────────────────┘    └──────────┬───────────┘
                                             │
                    ┌────────────────────────┼────────────────┐
                    ↓                        ↓                ↓
         ┌──────────────────┐   ┌──────────────┐  ┌──────────────┐
         │ Cloudflare D1    │   │ Cloudflare   │  │  Google      │
         │   (SQLite DB)    │   │  KV (Cache)  │  │  Sheets API  │
         └──────────────────┘   └──────────────┘  └──────────────┘
```

## 📂 Project Structure

```
BOCalc/
├── src/                          # Frontend (Next.js)
│   ├── app/                      # App Router
│   │   ├── [locale]/            # Internationalized routes
│   │   │   ├── (auth)/          # Auth pages (login, register)
│   │   │   ├── (public)/        # Public pages (landing, calculator)
│   │   │   └── (dashboard)/     # Protected pages (admin, vendors)
│   │   ├── api/                 # API routes (proxy to Workers)
│   │   └── globals.css          # Global styles
│   ├── components/              # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── calculator/          # Calculator-specific components
│   │   ├── vendors/             # Vendor management components
│   │   ├── users/               # User management components
│   │   └── layout/              # Layout components (Header, Sidebar)
│   ├── lib/                     # Utilities and helpers
│   │   ├── utils.ts             # General utilities
│   │   ├── constants.ts         # Application constants
│   │   ├── calculator-engine.ts # Core calculation logic
│   │   ├── api-client.ts        # API client wrapper
│   │   └── validators.ts        # Input validation schemas
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts           # Authentication hook
│   │   ├── useCalculator.ts     # Calculator state management
│   │   └── useVendor.ts         # Vendor data hook
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts             # All application types
│   ├── messages/                # i18n translations
│   │   ├── en.json              # English
│   │   ├── ru.json              # Russian
│   │   └── uk.json              # Ukrainian
│   └── i18n.ts                  # i18n configuration
│
├── workers/                     # Cloudflare Workers (Backend)
│   ├── src/
│   │   ├── index.ts             # Main entry point
│   │   ├── router.ts            # API routing (Hono)
│   │   ├── middleware/          # Middleware (auth, cors, rate-limit)
│   │   ├── handlers/            # Request handlers
│   │   │   ├── auth.ts          # Authentication handlers
│   │   │   ├── users.ts         # User management
│   │   │   ├── vendors.ts       # Vendor management
│   │   │   ├── calculator.ts    # Calculator API
│   │   │   ├── sheets.ts        # Google Sheets sync
│   │   │   └── audit.ts         # Audit log handlers
│   │   ├── services/            # Business logic
│   │   │   ├── auth-service.ts  # Auth logic (JWT, bcrypt)
│   │   │   ├── calculator-service.ts # Calculation engine
│   │   │   ├── sheets-service.ts # Google Sheets integration
│   │   │   └── audit-service.ts # Audit logging
│   │   ├── models/              # Database models
│   │   │   ├── user.ts          # User model
│   │   │   ├── vendor.ts        # Vendor model
│   │   │   └── audit-log.ts     # Audit log model
│   │   └── utils/               # Worker utilities
│   └── migrations/              # D1 migrations
│
├── database/                    # Database schema
│   └── migrations/
│       └── 0001_initial_schema.sql
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # This file
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── GOOGLE_SHEETS_SETUP.md   # Google Sheets setup
│   └── API.md                   # API documentation
│
├── scripts/                     # Utility scripts
│   ├── setup-google-sheets.js   # Google Sheets setup script
│   └── generate-test-data.js    # Generate test data
│
├── public/                      # Static assets
│   ├── images/
│   └── fonts/
│
├── .github/                     # GitHub Actions
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
│
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── tailwind.config.ts           # Tailwind CSS config
├── next.config.js               # Next.js config
├── wrangler.toml                # Cloudflare Workers config
└── README.md                    # Main documentation
```

## 🔄 Data Flow

### 1. User Calculation Flow

```
User Input (Frontend)
    ↓
Validation (Zod schemas)
    ↓
API Request (TanStack Query)
    ↓
Cloudflare Workers API
    ↓
Check KV Cache (pricing data)
    ↓
Calculator Engine (business logic)
    ↓
Save to D1 (if user authenticated)
    ↓
Audit Log (D1)
    ↓
Response to Frontend
    ↓
Display Results
```

### 2. Google Sheets Sync Flow

```
Cron Trigger (every 5 minutes)
    ↓
Cloudflare Workers
    ↓
Google Sheets API (fetch data)
    ↓
Transform & Validate
    ↓
Compare with cached version
    ↓
Update D1 (sheets_cache table)
    ↓
Update KV (with TTL 5 min)
    ↓
Audit Log (sync event)
    ↓
Notify on errors (email)
```

### 3. Authentication Flow

```
User Login (Frontend)
    ↓
API /auth/login (Workers)
    ↓
Verify credentials (bcrypt)
    ↓
Generate JWT tokens
    ↓
    ├─ Access Token (15 min)
    └─ Refresh Token (7 days)
    ↓
Store in D1 (refresh_tokens table)
    ↓
Return tokens to Frontend
    ↓
Store in localStorage
    ↓
Include in API requests (Authorization header)
```

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│   vendors   │──┐    │    users    │
└─────────────┘  │    └─────────────┘
                 │           │
                 │           │ (user_id)
                 │           ↓
                 │    ┌─────────────┐
                 └───→│ audit_logs  │
                      └─────────────┘
                             │
                             │ (user_id)
                             ↓
                      ┌─────────────┐
                      │calculations │
                      └─────────────┘

┌──────────────┐
│sheets_cache  │ (Cached Google Sheets data)
└──────────────┘

┌──────────────┐
│refresh_tokens│ (JWT refresh tokens)
└──────────────┘
```

### Key Tables

**users**
- Primary authentication and authorization
- Links to vendor (many-to-one)
- Roles: admin, vendor, viewer

**vendors**
- Multi-tenant isolation
- Custom settings per vendor
- Pricing rules can be vendor-specific

**audit_logs**
- Complete audit trail
- Tracks all user actions
- Enables compliance and debugging

**sheets_cache**
- Caches Google Sheets data
- Reduces API calls to Google
- Versioning support

**calculations**
- Stores calculation history
- Enables analytics
- User can retrieve past calculations

## 🔐 Security Architecture

### Authentication & Authorization

```
┌──────────────────────────────────────────────┐
│               User Request                    │
└────────────────┬─────────────────────────────┘
                 │
                 ↓
         ┌──────────────┐
         │  JWT Token   │
         │  Middleware  │
         └──────┬───────┘
                │
        Verify Token
                │
        ┌───────┴────────┐
        │                │
    Valid?           Invalid
        │                │
        ↓                ↓
   ┌─────────┐    ┌──────────┐
   │ Decode  │    │ 401      │
   │ Payload │    │ Unauthorized │
   └────┬────┘    └──────────┘
        │
        ↓
   Extract User
        │
        ↓
   ┌──────────────┐
   │ Check Role   │
   │ Authorization│
   └──────┬───────┘
          │
   ┌──────┴────────┐
   │               │
Allowed?       Forbidden
   │               │
   ↓               ↓
┌──────┐      ┌──────┐
│ Next │      │ 403  │
│Handler│     │Forbidden│
└──────┘      └──────┘
```

### Security Layers

1. **Transport Security**
   - HTTPS only (enforced)
   - TLS 1.2+ minimum
   - HSTS enabled

2. **Authentication**
   - JWT tokens with short expiry
   - Refresh token rotation
   - bcrypt password hashing (12 rounds)

3. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - Vendor isolation

4. **Input Validation**
   - Zod schemas for all inputs
   - SQL injection prevention (parameterized queries)
   - XSS protection

5. **Rate Limiting**
   - 100 requests/minute per IP
   - Separate limits for auth endpoints
   - Cloudflare WAF integration

6. **Audit Logging**
   - All mutations logged
   - IP address tracking
   - User agent logging

## 🚀 Performance Optimization

### Caching Strategy

```
┌─────────────────────────────────────┐
│          Cache Layers               │
├─────────────────────────────────────┤
│ 1. Browser Cache                    │
│    - Static assets (immutable)      │
│    - 1 year cache                   │
├─────────────────────────────────────┤
│ 2. Cloudflare CDN                   │
│    - HTML pages (short TTL)         │
│    - API responses (if cacheable)   │
├─────────────────────────────────────┤
│ 3. Cloudflare KV                    │
│    - Google Sheets data (5 min)     │
│    - Reference data (1 hour)        │
├─────────────────────────────────────┤
│ 4. D1 Database                      │
│    - Persistent data                │
│    - Query optimization (indexes)   │
└─────────────────────────────────────┘
```

### Optimization Techniques

1. **Edge Computing**
   - API runs on Cloudflare Workers (global edge)
   - Sub-50ms response times worldwide

2. **Database Optimization**
   - Indexes on frequently queried columns
   - Denormalized data where appropriate
   - Batch operations for bulk updates

3. **Frontend Optimization**
   - Code splitting (Next.js automatic)
   - Image optimization (Next.js Image)
   - Lazy loading for heavy components
   - TanStack Query for efficient data fetching

4. **API Optimization**
   - Response compression (Brotli/Gzip)
   - Pagination for list endpoints
   - Field selection (GraphQL-style)

## 🌐 Multi-Vendor Architecture

### Isolation Levels

```
┌───────────────────────────────────────┐
│         Global Resources              │
│  - Auctions                           │
│  - US States                          │
│  - Default Pricing Rules              │
└───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
┌──────────────┐    ┌──────────────┐
│  Vendor A    │    │  Vendor B    │
│              │    │              │
│ - Users      │    │ - Users      │
│ - Custom     │    │ - Custom     │
│   Pricing    │    │   Pricing    │
│ - Branding   │    │ - Branding   │
│ - Settings   │    │ - Settings   │
└──────────────┘    └──────────────┘
```

### Data Segregation

1. **User Level**
   - Users belong to one vendor
   - Cannot see other vendors' data
   - Exception: admin role (cross-vendor)

2. **Pricing Level**
   - Default global pricing rules
   - Vendor-specific overrides
   - Priority system (vendor > global)

3. **Calculation Level**
   - Calculations tagged with vendor_id
   - Analytics per vendor
   - Cross-vendor comparison (admin only)

## 🔄 Google Sheets Integration

### Sync Mechanism

```
┌────────────────────────────────────────┐
│     Cron Trigger (Every 5 min)         │
└────────────────┬───────────────────────┘
                 │
                 ↓
         ┌──────────────┐
         │ Sync Service │
         └──────┬───────┘
                │
        ┌───────┴────────┐
        │                │
        ↓                ↓
  ┌─────────┐      ┌─────────┐
  │ Fetch   │      │ Check   │
  │ Sheets  │      │ Version │
  └────┬────┘      └────┬────┘
       │                │
       └────────┬───────┘
                │
         Compare Changes
                │
        ┌───────┴────────┐
        │                │
   No Changes       Has Changes
        │                │
        ↓                ↓
    ┌──────┐      ┌──────────┐
    │ Skip │      │ Update   │
    └──────┘      │ Cache    │
                  └────┬─────┘
                       │
                       ↓
                  ┌─────────┐
                  │ Audit   │
                  │ Log     │
                  └─────────┘
```

### Conflict Resolution

- **Strategy**: Last Write Wins (LWW)
- **Timestamp**: `updated_at` column
- **Validation**: Data validated before applying
- **Rollback**: Version history in `sheets_cache`

## 📊 Monitoring & Observability

### Metrics Collected

1. **Request Metrics**
   - Request rate (requests/second)
   - Response time (p50, p95, p99)
   - Error rate (4xx, 5xx)

2. **Business Metrics**
   - Calculations performed
   - User registrations
   - Vendor activity
   - Sync success rate

3. **Resource Metrics**
   - D1 query performance
   - KV hit rate
   - Worker CPU time
   - Memory usage

### Logging

```
Log Level: INFO, WARN, ERROR
Format: JSON
Fields:
  - timestamp
  - level
  - message
  - user_id (if applicable)
  - vendor_id (if applicable)
  - request_id
  - duration_ms
  - error (if applicable)
```

## 🔧 Development Workflow

```
Developer
    ↓
Local Development
    ├─ Next.js dev server (localhost:3000)
    └─ Wrangler local mode (localhost:8787)
    ↓
Git Commit
    ↓
Push to GitHub
    ↓
GitHub Actions (CI/CD)
    ├─ Run Tests
    ├─ Lint Code
    └─ Type Check
    ↓
Deploy to Staging
    ├─ Workers (staging environment)
    └─ Pages (preview deployment)
    ↓
Manual Testing
    ↓
Merge to Main
    ↓
Deploy to Production
    ├─ Workers (production)
    └─ Pages (production)
```

## 🧪 Testing Strategy

### Test Pyramid

```
         ┌─────────┐
         │   E2E   │   (10%)
         │  Tests  │
         └─────────┘
       ┌─────────────┐
       │ Integration │   (30%)
       │    Tests    │
       └─────────────┘
     ┌─────────────────┐
     │   Unit Tests    │   (60%)
     └─────────────────┘
```

1. **Unit Tests**
   - Pure functions
   - Utility functions
   - Calculator engine
   - Validators

2. **Integration Tests**
   - API endpoints
   - Database operations
   - Google Sheets sync

3. **E2E Tests**
   - Critical user flows
   - Calculator usage
   - Authentication flow
   - Vendor management

## 📈 Scalability Considerations

### Vertical Scaling

- Cloudflare auto-scales Workers
- D1 supports up to 10GB (free tier)
- KV supports unlimited storage

### Horizontal Scaling

- Multi-region deployment (automatic with Cloudflare)
- Stateless Workers (no session affinity needed)
- Database replication (D1 read replicas)

### Performance Targets

- API Response Time: < 300ms (p95)
- Page Load Time: < 2s (First Contentful Paint)
- Time to Interactive: < 3s
- Calculator Calculation: < 500ms
- Google Sheets Sync: < 10s

## 🔐 Compliance & Privacy

### Data Storage

- **Location**: Cloudflare global network
- **Encryption**: At rest and in transit
- **Backup**: Automatic D1 backups
- **Retention**: Configurable per data type

### GDPR Compliance

- User data export functionality
- Right to be forgotten (user deletion)
- Audit logging
- Data processing agreements

### Security Standards

- OWASP Top 10 mitigation
- Regular security audits
- Dependency vulnerability scanning
- Secrets management (Wrangler secrets)

---

**Version**: 1.0  
**Last Updated**: 2025-11-17  
**Maintained by**: Kirill Za (zaaatakyrylo@gmail.com)


