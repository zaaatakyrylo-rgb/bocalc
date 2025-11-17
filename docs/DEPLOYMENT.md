# Deployment Guide - Cloudflare Pages & Workers

This guide will walk you through deploying BOCalc to Cloudflare using account: zaaatakyrylo@gmail.com

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account (zaaatakyrylo@gmail.com)
- Git repository (GitHub, GitLab, or Bitbucket)
- Google Cloud Project with Sheets API enabled

## 🚀 Step-by-Step Deployment

### 1. Cloudflare Account Setup

#### 1.1 Login to Cloudflare
```bash
npx wrangler login
```
This will open a browser window to authenticate with your Cloudflare account (zaaatakyrylo@gmail.com).

#### 1.2 Get Account ID
```bash
npx wrangler whoami
```
Copy your Account ID and update it in `wrangler.toml`.

### 2. Create Cloudflare D1 Database

```bash
# Create production database
npx wrangler d1 create bocalc-db

# Copy the database ID from output and update wrangler.toml
```

Update `wrangler.toml` with the database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "bocalc-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

#### 2.1 Run Migrations
```bash
# Apply migrations to production database
npx wrangler d1 migrations apply bocalc-db --remote

# For local development
npx wrangler d1 migrations apply bocalc-db --local
```

### 3. Create Cloudflare KV Namespace

```bash
# Create KV namespace for caching
npx wrangler kv:namespace create "CACHE"

# Copy the ID and update wrangler.toml
```

Update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"
```

### 4. Set Up Environment Variables

#### 4.1 Cloudflare Workers Secrets

```bash
# JWT Secret
npx wrangler secret put JWT_SECRET
# Enter a strong random string (min 32 chars)

# Google Service Account Email
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# Enter: your-service-account@project.iam.gserviceaccount.com

# Google Private Key
npx wrangler secret put GOOGLE_PRIVATE_KEY
# Paste the entire private key from service account JSON

# Google Sheets ID
npx wrangler secret put GOOGLE_SHEETS_ID
# Enter your Google Sheet ID

# Admin Email
npx wrangler secret put ADMIN_EMAIL
# Enter: zaaatakyrylo@gmail.com
```

#### 4.2 Environment Variables (wrangler.toml)

Already configured in `wrangler.toml`:
```toml
[env.production]
vars = { ENVIRONMENT = "production" }
```

### 5. Deploy Cloudflare Workers

```bash
# Install dependencies
npm install

# Build and deploy workers
cd workers
npm run build
npx wrangler deploy --env production
```

This will deploy your API endpoints to:
```
https://bocalc-api.YOUR-SUBDOMAIN.workers.dev
```

### 6. Deploy Frontend to Cloudflare Pages

#### 6.1 Via Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select "Pages" from left sidebar
3. Click "Create a project"
4. Connect your Git repository
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `/`
   - **Framework preset**: Next.js

6. Add Environment Variables:
   ```
   NEXT_PUBLIC_APP_URL=https://bocalc.pages.dev
   NEXT_PUBLIC_API_URL=https://bocalc-api.YOUR-SUBDOMAIN.workers.dev
   NODE_VERSION=18
   ```

7. Click "Save and Deploy"

#### 6.2 Via Wrangler CLI (Alternative)

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name=bocalc
```

### 7. Configure Custom Domain (Optional)

#### 7.1 Add Custom Domain to Pages

1. Go to Cloudflare Pages → Your Project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g., `bocalc.yourdomain.com`)
4. Follow DNS setup instructions

#### 7.2 Update Environment Variables

Update `NEXT_PUBLIC_APP_URL` in Cloudflare Pages settings:
```
NEXT_PUBLIC_APP_URL=https://bocalc.yourdomain.com
```

### 8. Set Up Google Sheets Sync

#### 8.1 Enable Cron Trigger

The cron trigger is already configured in `wrangler.toml`:
```toml
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

This will automatically sync with Google Sheets every 5 minutes.

#### 8.2 Verify Cron Trigger

```bash
# List cron triggers
npx wrangler deployments list

# View logs
npx wrangler tail
```

### 9. Post-Deployment Checklist

- [ ] D1 Database created and migrated
- [ ] KV Namespace created
- [ ] All secrets configured
- [ ] Workers deployed successfully
- [ ] Frontend deployed to Pages
- [ ] Custom domain configured (if applicable)
- [ ] Cron trigger for Google Sheets sync working
- [ ] Test authentication flow
- [ ] Test calculator functionality
- [ ] Test Google Sheets sync
- [ ] Verify audit logging
- [ ] Check error monitoring

### 10. Monitoring & Logs

#### 10.1 View Worker Logs

```bash
# Tail live logs
npx wrangler tail

# View logs in dashboard
# Go to Cloudflare Dashboard → Workers & Pages → Your Worker → Logs
```

#### 10.2 View Pages Deployment Logs

1. Go to Cloudflare Dashboard → Pages → Your Project
2. Click on a deployment
3. View build and function logs

#### 10.3 Analytics

- **Workers Analytics**: Dashboard → Workers & Pages → Analytics
- **Pages Analytics**: Dashboard → Pages → Your Project → Analytics

### 11. Database Management

#### 11.1 Query Database

```bash
# Execute SQL query
npx wrangler d1 execute bocalc-db --command="SELECT * FROM users LIMIT 10"

# Open interactive console
npx wrangler d1 execute bocalc-db
```

#### 11.2 Backup Database

```bash
# Export database
npx wrangler d1 execute bocalc-db --command="SELECT * FROM users" > backup_users.json

# For full backup, you'll need to export each table
```

### 12. Rollback

#### 12.1 Rollback Workers

```bash
# List previous deployments
npx wrangler deployments list

# Rollback to specific version
npx wrangler rollback [DEPLOYMENT_ID]
```

#### 12.2 Rollback Pages

1. Go to Cloudflare Dashboard → Pages → Your Project
2. View all deployments
3. Click "..." on a previous deployment
4. Click "Rollback to this deployment"

### 13. CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: workers
          command: deploy --env production
      
      - name: Deploy Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: bocalc
          directory: .next
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

#### 13.1 Add GitHub Secrets

Go to GitHub Repository → Settings → Secrets and variables → Actions

Add:
- `CLOUDFLARE_API_TOKEN`: Create in Cloudflare Dashboard → My Profile → API Tokens
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

### 14. Production Optimization

#### 14.1 Enable Cloudflare Cache

In Cloudflare Dashboard:
1. Go to your domain → Caching → Configuration
2. Enable Tiered Cache
3. Set Browser Cache TTL to 4 hours
4. Enable "Cache Everything" page rule for static assets

#### 14.2 Enable Security Features

1. **SSL/TLS**: Set to "Full (strict)"
2. **Always Use HTTPS**: Enable
3. **Automatic HTTPS Rewrites**: Enable
4. **Minimum TLS Version**: TLS 1.2
5. **Enable DNSSEC**: Enable

#### 14.3 Performance Settings

1. **Auto Minify**: Enable for HTML, CSS, JS
2. **Brotli Compression**: Enable
3. **HTTP/2**: Enable
4. **HTTP/3 (QUIC)**: Enable

### 15. Costs Estimation

With Cloudflare Free tier:
- **Workers**: 100,000 requests/day (free)
- **Pages**: Unlimited requests (free)
- **D1**: 5 GB storage (free)
- **KV**: 100,000 reads/day (free)

For higher traffic:
- **Workers Paid**: $5/month for 10M requests
- **D1 Paid**: $5/month for additional storage
- **KV Paid**: $0.50/GB/month

### 16. Troubleshooting

#### Database Migration Errors
```bash
# Check D1 database status
npx wrangler d1 info bocalc-db

# Re-run migrations
npx wrangler d1 migrations apply bocalc-db --remote
```

#### Google Sheets Sync Not Working
```bash
# Check worker logs
npx wrangler tail

# Test sync endpoint manually
curl -X POST https://your-api.workers.dev/api/sheets/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### 17. Support & Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

---

**Deployed by**: Kirill Za (zaaatakyrylo@gmail.com)  
**Last Updated**: 2025-11-17


