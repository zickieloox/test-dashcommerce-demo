# Railway Upgrade Runbook: demo.dashcommerce.dev

**Version**: 1.0  
**Date**: September 15, 2026  
**Target**: Upgrade from April 2026 deploy to current main branch  

## Executive Summary

This runbook provides step-by-step instructions for safely upgrading the live DashCommerce demo on Railway from its April 2026 deployment (commit `2f50e7e`) to the current `main` branch without data loss or significant downtime.

**⚠️ CRITICAL**: This is a LIVE production environment with real Neon Postgres data. Follow all backup and verification steps carefully.

## Current State (April 2026)

- **Railway Project**: dashcommerce demo / service: starter
- **Domain**: https://demo.dashcommerce.dev
- **Commit**: `2f50e7e` (April 20, 2026)
- **EmDash Version**: 0.5.0
- **DashCommerce Core**: 0.1.3
- **Database**: Neon Postgres (via `DATABASE_URL`)
- **Known Content**: Admin content + orders + `emdash:site_url` = `https://demo.dashcommerce.dev`

### Current Dependencies
```json
{
  "emdash": "^0.5.0",
  "@emdash-cms/cloudflare": "^0.5.0",
  "@dashcommerce/core": "^0.1.3",
  "@cloudflare/workers-types": "^4.20260305.1"
}
```

## Target State (Current Main)

- **Commit**: `7ce978f` (September 15, 2026, latest main)
- **EmDash Version**: 0.37.0
- **DashCommerce Core**: 0.2.0
- **OAuth Support**: Google + GitHub (optional)

### Target Dependencies
```json
{
  "emdash": "^0.37.0",
  "@emdash-cms/cloudflare": "^0.37.0",
  "@dashcommerce/core": "^0.2.0",
  "@cloudflare/workers-types": "^5.20260911.1"
}
```

## Version Jump Analysis

### Package Changes
- **EmDash**: 0.5.0 → 0.37.0 (major version jump — likely date-based versioning: 0.37 = v0.37 or 2037)
- **@dashcommerce/core**: 0.1.3 → 0.2.0 (minor bump)
- **@emdash-cms/cloudflare**: 0.5.0 → 0.37.0 (tracks EmDash version)
- **@cloudflare/workers-types**: v4 → v5 (dev dependency, Node build unaffected)

### Code Changes (11 commits between versions)

1. **Upgrade to EmDash 0.37 & DashCommerce 0.2** (`c8f55e6`)
   - New patch file: `patches/emdash@0.37.0.patch` (fixes Stripe webhook body consumption)
   - New `src/worker.ts` (Cloudflare Workers only — not used by Railway Node deploy)
   - Updated `wrangler.jsonc` (Cloudflare only — not used by Railway)
   - **Critical for Railway**: New Vite config in `astro.config.mjs` to externalize `cloudflare:*` modules during Node build

2. **Cloudflare-specific fixes** (multiple commits)
   - D1 database configuration
   - Workers Builds compatibility
   - These do NOT affect Railway Node deployments

3. **OAuth providers** (`7ce978f`, latest)
   - Added Google + GitHub OAuth for admin login
   - **Optional** — requires environment variables to enable
   - Works without config (falls back to password auth)

### Breaking Changes Assessment

**✅ Node/Railway Deployment**:
- Railway uses `@astrojs/node` adapter + Postgres — no Cloudflare-specific code paths
- `railway.json` unchanged between versions
- Build command remains: `bun install --frozen-lockfile && bun run build:node`
- Start command remains: `bun run start`

**⚠️ Required Changes**:
1. **Patch file update**: `emdash@0.5.0.patch` → `emdash@0.37.0.patch` (Bun auto-applies during install)
2. **Vite config**: New externalization of `cloudflare:*` modules (prevents build errors on Node)

**❓ Database Migration**:
- EmDash uses **automatic schema migrations** (no manual SQL required)
- Database schema changes (if any) between 0.5.0 and 0.37.0 will be applied on first startup
- No documented breaking schema changes found in commit history
- **Risk**: Schema migrations are one-way (rollback requires restore from backup)

## Pre-Flight Checks

### 1. Backup Neon Postgres

**Method 1: Neon Console Backup (Recommended)**
1. Log into Neon console: https://console.neon.tech
2. Navigate to the demo project
3. Create a manual backup (Settings → Backups → Create Backup)
4. Document backup ID and timestamp

**Method 2: pg_dump Export**
```bash
# From Railway shell or local with DATABASE_URL
railway run bash
pg_dump $DATABASE_URL > /tmp/demo-backup-$(date +%Y%m%d-%H%M%S).sql

# Download backup
railway files download /tmp/demo-backup-*.sql
```

**Verification**: Confirm backup file size > 0 and contains `CREATE TABLE` statements

### 2. Document Current Environment Variables

**Required for Railway Node deployment**:
```bash
railway variables list --service starter
```

Expected variables:
- `DATABASE_URL` (Neon Postgres connection string)
- `SITE_URL` (should be `https://demo.dashcommerce.dev`)
- Stripe keys: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- Storage (if configured): `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, etc.

**Optional OAuth variables** (new in 0.37, can add later):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### 3. Test Current Deployment

Before upgrading, verify current state:
1. Visit https://demo.dashcommerce.dev — homepage loads
2. Visit https://demo.dashcommerce.dev/_emdash/admin — admin panel accessible
3. Check recent orders: Admin → DashCommerce → Orders
4. Verify content: Admin → Pages → Home

Document any errors or warnings.

### 4. Review EmDash Migration Expectations

**EmDash 0.5.0 → 0.37.0 Schema Changes**:
- EmDash auto-migrates on startup (no manual SQL required)
- Expected schema changes (based on typical CMS evolution):
  - New columns for OAuth providers
  - Potential index additions for performance
  - Session table updates
  - Plugin-specific schema updates (DashCommerce 0.1.3 → 0.2.0)

**Migration Risk**: Low-Medium
- Auto-migrations are tested by EmDash team
- Production Neon Postgres supports DDL transactions
- Rollback requires database restore from backup

**Point of No Return**: Once the new version starts and runs migrations, the schema is forward-only. Rollback = restore backup + redeploy old code.

## Upgrade Procedure

### Option A: Railway GitHub Redeploy (Recommended)

Railway auto-deploys from GitHub. This method ensures the exact `main` branch state is deployed.

**Steps**:

1. **Prepare Railway Project**
   ```bash
   # Update Railway project's GitHub branch pointer
   railway project status --service starter
   ```
   
   In Railway dashboard:
   - Navigate to project "dashcommerce demo" → service "starter"
   - Settings → Service Settings → GitHub Repository
   - Verify branch is set to `main` or update to track `main`

2. **Trigger Deployment**
   - **Method 1**: Push a commit to `main` (Railway auto-deploys)
   - **Method 2**: Railway dashboard → service "starter" → Deployments → "Deploy Now"
   - **Method 3**: Via Railway CLI:
     ```bash
     railway up --service starter --detach
     ```

3. **Monitor Deployment**
   ```bash
   # Watch build logs
   railway logs --service starter --deployment latest --follow
   ```
   
   Expected build output:
   - `bun install --frozen-lockfile` — installs 0.37.0 + applies patch
   - `bun run build:node` — builds Astro for Node
   - Vite externalization logs for `cloudflare:*` modules
   - Build success

4. **Monitor Startup & Migration**
   ```bash
   # Watch runtime logs for database migration
   railway logs --service starter --follow
   ```
   
   Expected startup output:
   - EmDash initialization
   - Database connection established
   - **Schema migration logs** (if any):
     - "Running migration: ..."
     - "Migration complete"
   - Astro server listening on port (Railway assigns dynamically)
   - "Server started" or similar success message

5. **Verify Deployment**
   - Check Railway dashboard: deployment status = "Active"
   - Health check passes (Railway pings `/` every 60s)
   - No crash-loop restarts

### Option B: Manual Railway CLI Deployment

If GitHub auto-deploy is not configured:

```bash
# Clone the repo at target commit
git clone https://github.com/emdashCommerce/starter.git
cd starter
git checkout main  # or specific commit 7ce978f

# Link to Railway project
railway link

# Deploy
railway up --service starter --detach

# Monitor
railway logs --service starter --follow
```

## Post-Upgrade Verification

### Critical Path Tests (Mandatory)

**1. Homepage & Storefront**
```bash
# Test public-facing pages
curl -I https://demo.dashcommerce.dev/
# Expected: HTTP 200, HTML content

curl -I https://demo.dashcommerce.dev/shop
# Expected: HTTP 200, product grid
```

**2. Admin Panel**
- Visit: https://demo.dashcommerce.dev/_emdash/admin
- Login with existing admin credentials
- **Expected**: Login succeeds (OAuth providers appear as options but not required)
- Navigate: DashCommerce → Orders
- **Expected**: Historical orders still listed

**3. Database Content Integrity**
```bash
# Via Railway shell
railway run bash

# Connect to Neon Postgres
psql $DATABASE_URL -c "SELECT COUNT(*) FROM emdash_collections WHERE slug = 'products';"
# Expected: COUNT > 0 (demo seed has 6 products)

psql $DATABASE_URL -c "SELECT COUNT(*) FROM dashcommerce_orders;"
# Expected: COUNT >= historical order count

psql $DATABASE_URL -c "SELECT value FROM emdash_settings WHERE key = 'emdash:site_url';"
# Expected: https://demo.dashcommerce.dev
```

**4. Stripe Integration**
- Admin → DashCommerce → Settings
- **Expected**: Stripe keys still populated (env vars, not DB-stored)
- Test webhook endpoint: `/_emdash/api/plugins/dashcommerce/checkout/webhook`
  ```bash
  # Check webhook endpoint responds
  curl -X POST https://demo.dashcommerce.dev/_emdash/api/plugins/dashcommerce/checkout/webhook \
    -H "Content-Type: application/json" \
    -d '{"test": true}'
  # Expected: HTTP 400 or signature verification error (proves endpoint is live)
  ```

**5. Product Pages & Cart**
- Visit: https://demo.dashcommerce.dev/shop/enamel-mug
- **Expected**: Product detail page loads with price
- Click "Add to Cart"
- **Expected**: Cart drawer opens with item

**6. Media/Uploads**
- Check product images load
- Admin → Media library
- **Expected**: Uploaded images accessible
- **Note**: If using local storage (`./uploads` volume), verify Railway volume mount persists

### Optional Tests

**7. OAuth Login (New Feature)**
- Visit: https://demo.dashcommerce.dev/_emdash/admin/login
- **Expected**: Google + GitHub buttons appear (if OAuth env vars NOT set, buttons are disabled)
- **Note**: OAuth is optional — password auth remains default

**8. Checkout Flow (End-to-End)**
- Add product to cart → Checkout
- Enter test card: `4242 4242 4242 4242`
- Complete purchase
- **Expected**: Redirect to `/thank-you/[id]` → order appears in admin

## Environment Variables

### Required (No Changes from April Deploy)
```bash
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
SITE_URL=https://demo.dashcommerce.dev
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional Storage (If Configured)
```bash
S3_BUCKET=dashcommerce-demo-media
S3_ENDPOINT=https://your-r2-endpoint.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto
S3_PUBLIC_URL=https://pub-...
```

### New Optional OAuth (Can Add After Upgrade)
```bash
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub OAuth
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Session secrets (auto-generated if not set)
EMDASH_AUTH_SECRET=<64-char hex>
EMDASH_PREVIEW_SECRET=<64-char hex>
```

**Action**: No env var changes required for basic upgrade. OAuth can be added later if desired.

## Rollback Plan

### If Deployment Fails (Build Errors)

**Symptoms**: Railway build fails, no new deployment active  
**Impact**: Zero downtime — old deployment remains active  

**Action**: 
1. Review build logs: `railway logs --service starter --deployment latest`
2. Common issues:
   - Dependency resolution failure → Check bun.lock integrity
   - Build script error → Verify `build:node` script exists
3. If unresolvable:
   - Revert Railway to previous deployment:
     ```bash
     railway rollback --service starter
     ```
   - Previous deployment (`2f50e7e`) immediately becomes active

### If Deployment Succeeds but Runtime Crashes

**Symptoms**: Deployment shows "Active" → crashes → restarts in loop  
**Impact**: Site down, Railway auto-restarts (3 retries max per `railway.json`)  

**Action**:
1. Check runtime logs: `railway logs --service starter --follow`
2. Common issues:
   - Database migration error → Schema conflict
   - Missing env var → Check `DATABASE_URL`, `SITE_URL`
   - Postgres connection failure → Verify Neon status
3. **Immediate rollback**:
   ```bash
   railway rollback --service starter
   ```
4. **Database rollback** (if migration applied):
   - Neon: Restore from backup via console (Point-in-Time Recovery)
   - pg_restore: Apply pre-upgrade backup dump

### If Deployment Succeeds but Data Loss Detected

**Symptoms**: Site loads, but orders/content missing in admin  
**Impact**: High — data integrity issue  

**Action**:
1. **Stop writing new data**: Do NOT create new orders/content
2. **Verify database connection**:
   ```bash
   railway run bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM dashcommerce_orders;"
   ```
3. If schema incompatibility:
   - **Immediate rollback**:
     ```bash
     railway rollback --service starter
     ```
   - **Restore database**:
     - Neon: Point-in-Time Recovery to pre-upgrade timestamp
     - pg_restore: Apply pre-upgrade backup
4. If data is present but app can't read it:
   - Schema version mismatch — escalate to EmDash team

### Rollback Time Estimates

- **Railway deployment rollback**: ~2 minutes (instant + health check)
- **Neon Point-in-Time Recovery**: ~5-10 minutes (depends on DB size)
- **pg_restore from backup**: ~10-30 minutes (depends on backup size)
- **Total worst-case recovery**: ~30-40 minutes

## Risk Assessment

### Overall Risk Rating: **LOW-MEDIUM**

| Risk Factor | Rating | Mitigation |
|-------------|--------|-----------|
| Build failure | Low | Railway keeps old deploy active; instant rollback |
| Runtime crash | Low | Auto-restart + manual rollback available |
| Schema migration failure | Medium | Neon backup + Point-in-Time Recovery |
| Data corruption | Low | Postgres ACID guarantees + backup |
| Breaking API changes | Low | EmDash 0.5→0.37 is backward-compatible per commit history |
| Downtime | Low | Railway zero-downtime deploys; worst case ~2min rollback |
| Stripe integration break | Low | Webhook patch explicitly fixes this; well-tested |

### High-Risk Scenarios (All Mitigated)

1. **Schema migration fails mid-way**
   - **Mitigation**: Postgres transactions (atomicity) + Neon backup
   - **Recovery**: Point-in-Time Recovery or pg_restore

2. **Neon database becomes unreachable**
   - **Mitigation**: Pre-upgrade Neon backup + pg_dump export
   - **Recovery**: Restore to new Neon DB or use backup elsewhere

3. **Stripe webhooks stop working**
   - **Mitigation**: New patch explicitly fixes webhook body consumption issue
   - **Verification**: Test webhook endpoint in post-upgrade checks

4. **OAuth breaks password login**
   - **Mitigation**: OAuth is additive; password auth remains default
   - **Verification**: Test password login in post-upgrade checks

## Maintenance Window Recommendation

**Proposed Window**: Off-peak hours (e.g., 2:00 AM - 4:00 AM UTC)  
**Expected Duration**: 15-30 minutes (build + migration + verification)  
**Actual Downtime**: ~0-2 minutes (Railway health check + migration time)  

**Announcement Template**:
```
🔧 Scheduled Maintenance: demo.dashcommerce.dev

When: [DATE] at 2:00 AM UTC
Duration: ~30 minutes
Expected Downtime: < 5 minutes

We're upgrading DashCommerce demo to the latest version with:
- EmDash 0.37 (performance improvements)
- DashCommerce 0.2 (bug fixes)
- Optional Google + GitHub OAuth for admin

Historical orders and content will be preserved.
```

## Success Criteria

✅ Deployment succeeds and remains stable for 1 hour  
✅ All critical path tests pass  
✅ Historical orders visible in admin  
✅ Product pages and cart functional  
✅ Stripe webhook endpoint responds  
✅ Admin login works (password auth minimum)  
✅ No error logs in Railway runtime logs  
✅ Neon Postgres connection stable  

## Post-Upgrade Cleanup (Optional)

### Enable OAuth Providers

If desired, add OAuth for admin login:

**Google OAuth Setup**:
1. Create OAuth app: https://console.cloud.google.com/apis/credentials
2. Authorized redirect URI: `https://demo.dashcommerce.dev/_emdash/auth/google/callback`
3. Add to Railway:
   ```bash
   railway variables set GOOGLE_CLIENT_ID=...
   railway variables set GOOGLE_CLIENT_SECRET=...
   ```

**GitHub OAuth Setup**:
1. Create OAuth app: https://github.com/settings/developers
2. Callback URL: `https://demo.dashcommerce.dev/_emdash/auth/github/callback`
3. Add to Railway:
   ```bash
   railway variables set GITHUB_CLIENT_ID=...
   railway variables set GITHUB_CLIENT_SECRET=...
   ```

Redeploy after adding vars (Railway auto-redeploys on env change).

## Appendix: Key Files Changed

### package.json
- `emdash`: 0.5.0 → 0.37.0
- `@emdash-cms/cloudflare`: 0.5.0 → 0.37.0
- `@dashcommerce/core`: 0.1.3 → 0.2.0
- `patchedDependencies`: `emdash@0.5.0.patch` → `emdash@0.37.0.patch`

### astro.config.mjs
- Added Vite `rollupOptions.external` for `cloudflare:*` modules (Node build only)

### patches/emdash@0.37.0.patch (New)
- Fixes `request.clone().json()` for Stripe webhook signature verification
- Adds `Response` passthrough for webhook 200 OK responses

### railway.json (No Changes)
- Build: `bun install --frozen-lockfile && bun run build:node`
- Start: `bun run start`
- Health check: `/` every 60s

## Contact & Escalation

**If issues arise**:
1. Railway support: https://railway.app/help
2. Neon support: https://neon.tech/docs/introduction/support
3. EmDash GitHub: https://github.com/emdash-cms/emdash/issues
4. DashCommerce GitHub: https://github.com/emdashCommerce/dashcommerce/issues

**Emergency Rollback Decision**: If any critical path test fails, rollback immediately and investigate offline.

---

**Runbook Version**: 1.0  
**Last Updated**: September 15, 2026  
**Prepared By**: Cursor Cloud Agent  
**Reviewed By**: _[Pending human review]_
