# Migration: Proxy → API Subdomain Architecture

**Date:** 2026-02-03
**Branch:** `hotfix/migrate-to-api-subdomain`
**Status:** In Progress

## Overview

Migrating from reverse proxy architecture to API subdomain for better performance, reduced complexity, and elimination of proxy service costs.

**Before:**
- Frontend: `www.rydercupfriends.com` → Proxy: `www.rydercupfriends.com/api/*` → Backend: `backend.onrender.com`
- Cookies: domain `.onrender.com` rewritten to `.rydercupfriends.com` by proxy

**After:**
- Frontend: `www.rydercupfriends.com` → Backend: `api.rydercupfriends.com/api/*`
- Cookies: domain `.rydercupfriends.com` set directly by backend
- No proxy needed

---

## Completed Steps

- ✅ **Step 1:** DNS CNAME configured in Cloudflare (`api.rydercupfriends.com` → `rydercupam-euzt.onrender.com`)
- ✅ **Step 2:** Custom domain added in Render backend service
- ✅ **Step 3:** SSL certificate issued by Let's Encrypt
- ✅ **Step 4:** Frontend .env.example updated with production config documentation

---

## Backend Changes Required

### File: `/Users/agustinestevezdominguez/Documents/RyderCupAm/src/shared/infrastructure/security/cookie_handler.py`

Update all `response.set_cookie()` calls to include `domain` parameter:

```python
import os

# Add helper at top of file
def get_cookie_domain() -> str | None:
    """
    Retorna el dominio para las cookies.

    En producción: .rydercupfriends.com (permite subdomains)
    En desarrollo: None (default a localhost)
    """
    return os.getenv("COOKIE_DOMAIN", None)

# Update set_auth_cookie (line 78)
def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_production(),
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )

# Update delete_auth_cookie (line 110)
def delete_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=is_production(),
        samesite="lax",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )

# Update set_refresh_token_cookie (line 174)
def set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=is_production(),
        samesite="lax",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )

# Update delete_refresh_token_cookie (line 205)
def delete_refresh_token_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=is_production(),
        samesite="lax",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )

# Update set_csrf_cookie (line 269)
def set_csrf_cookie(response: Response, csrf_token: str) -> None:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False,  # CSRF must be readable by JS
        secure=is_production(),
        samesite="lax",
        max_age=CSRF_COOKIE_MAX_AGE,
        path="/",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )

# Update delete_csrf_cookie (line 300)
def delete_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        httponly=False,
        secure=is_production(),
        samesite="lax",
        domain=get_cookie_domain(),  # ← ADD THIS LINE
    )
```

### File: `/Users/agustinestevezdominguez/Documents/RyderCupAm/.env.example`

Add/update the following variables:

```bash
# ================================
# FRONTEND CONFIGURATION
# ================================
# Production: Main frontend domain
FRONTEND_ORIGINS=https://www.rydercupfriends.com

# Cookie domain for cross-subdomain authentication
# Production: .rydercupfriends.com (allows www + api subdomains)
# Development: Leave empty (defaults to localhost)
COOKIE_DOMAIN=.rydercupfriends.com

# Frontend URL for emails
FRONTEND_URL=https://www.rydercupfriends.com
```

### Render Backend Service - Environment Variables

Add/update in Render dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `FRONTEND_ORIGINS` | `https://www.rydercupfriends.com` | CORS allowed origin |
| `COOKIE_DOMAIN` | `.rydercupfriends.com` | Cookie domain (note the leading dot) |
| `FRONTEND_URL` | `https://www.rydercupfriends.com` | For email links |
| `ENVIRONMENT` | `production` | Enables secure cookies |

**Important:** The leading dot in `.rydercupfriends.com` is crucial - it allows cookies to work across all subdomains (www, api, etc.)

---

## Frontend Changes Required

### Render Frontend Service - Environment Variables

Add in Render dashboard:

| Variable | Value | Notes |
|----------|-------|-------|
| `API_BASE_URL` | `https://api.rydercupfriends.com` | Points to new API subdomain |

**Note:** No code changes needed in frontend! The `src/services/api.js` already uses `window.APP_CONFIG.API_BASE_URL` in production.

---

## Testing Plan

### 1. Pre-Deployment Testing (Staging/Local)

```bash
# Backend
cd /Users/agustinestevezdominguez/Documents/RyderCupAm
# Update .env with new variables
FRONTEND_ORIGINS=http://localhost:5173
COOKIE_DOMAIN=  # Empty for local
# Start backend
source .venv/bin/activate
uvicorn main:app --reload

# Frontend
cd /Users/agustinestevezdominguez/Documents/RyderCupWeb
# Update .env
VITE_API_BASE_URL=http://localhost:8000
# Start frontend
npm run dev

# Test auth flow
# 1. Login
# 2. Verify cookies in DevTools (should NOT have domain in local)
# 3. Make authenticated requests
# 4. Refresh token
# 5. Logout
```

### 2. Production Testing

After deploying both backend and frontend:

```bash
# 1. Open https://www.rydercupfriends.com
# 2. Open DevTools → Network → Preserve Log
# 3. Login with test account
# 4. Verify in DevTools → Application → Cookies:
#    - access_token (domain: .rydercupfriends.com, httpOnly: true)
#    - refresh_token (domain: .rydercupfriends.com, httpOnly: true)
#    - csrf_token (domain: .rydercupfriends.com, httpOnly: false)
# 5. Navigate to /dashboard (should stay authenticated)
# 6. Wait 15+ minutes → trigger token refresh
# 7. Check Network tab for /api/v1/auth/refresh-token call
# 8. Verify new cookies issued with same domain
# 9. Logout → verify cookies deleted
# 10. Try accessing /dashboard → should redirect to /login
```

### 3. CORS Testing

```bash
# Should succeed
curl -X OPTIONS https://api.rydercupfriends.com/api/v1/users/me \
  -H "Origin: https://www.rydercupfriends.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should see:
# Access-Control-Allow-Origin: https://www.rydercupfriends.com
# Access-Control-Allow-Credentials: true

# Should fail (wrong origin)
curl -X OPTIONS https://api.rydercupfriends.com/api/v1/users/me \
  -H "Origin: https://evil.com" \
  -v
```

---

## Deployment Steps

### 1. Deploy Backend Changes

```bash
cd /Users/agustinestevezdominguez/Documents/RyderCupAm

# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/api-subdomain-cookies

# Make cookie_handler.py changes
# Make .env.example changes

# Commit
git add src/shared/infrastructure/security/cookie_handler.py .env.example
git commit -m "feat(auth): ADD cookie domain support for subdomain architecture

- Add COOKIE_DOMAIN environment variable
- Update cookie_handler.py to use domain parameter
- Enable cross-subdomain authentication (www + api)
- Update .env.example with FRONTEND_ORIGINS and COOKIE_DOMAIN

BREAKING CHANGE: Requires COOKIE_DOMAIN=.rydercupfriends.com in production

Refs: Migration to api.rydercupfriends.com subdomain"

# Push and create PR
git push -u origin feature/api-subdomain-cookies
gh pr create --title "feat(auth): ADD cookie domain support for subdomain architecture" \
  --body "See MIGRATION_SUBDOMAIN.md for full details" \
  --base develop

# After PR approval
# Merge to develop
# Create release branch
# Deploy to production

# Update Render Backend Environment Variables (see table above)
```

### 2. Deploy Frontend Changes

```bash
cd /Users/agustinestevezdominguez/Documents/RyderCupWeb

# Already on hotfix/migrate-to-api-subdomain
# Commit .env.example changes
git add .env.example MIGRATION_SUBDOMAIN.md
git commit -m "docs(config): UPDATE .env.example for API subdomain migration

- Document API_BASE_URL production configuration
- Add migration guide (MIGRATION_SUBDOMAIN.md)
- No code changes required (already supports runtime config)

Refs: Migration from proxy to api.rydercupfriends.com"

git push -u origin hotfix/migrate-to-api-subdomain

# Create PR to main (hotfix flow)
gh pr create --title "docs(config): UPDATE .env.example for API subdomain migration" \
  --body "Migration from proxy to api.rydercupfriends.com subdomain" \
  --base main

# After merge
# Update Render Frontend Environment Variables (see table above)
# Trigger redeploy
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback (Keep Proxy)

1. **Render Frontend:** Remove `API_BASE_URL` env var → will use proxy again
2. **Render Backend:** Remove `COOKIE_DOMAIN` env var → cookies work with proxy rewrite
3. Redeploy both services

### Full Rollback (Git)

```bash
# Backend
git revert <commit-sha>
git push

# Frontend
git revert <commit-sha>
git push
```

---

## Post-Migration Cleanup

After 7 days of stable operation:

1. **Remove Proxy Service from Render:**
   - Go to Render dashboard
   - Select proxy service (rydercup-proxy)
   - Settings → Delete Service

2. **Remove Proxy DNS Record:**
   - Go to Cloudflare
   - DNS → Remove www CNAME to proxy (keep www pointing to frontend)

3. **Archive Proxy Code:**
   ```bash
   cd /Users/agustinestevezdominguez/Documents/RyderCupWeb
   git rm -r proxy/
   git commit -m "chore(cleanup): REMOVE proxy service (migrated to subdomain)"
   ```

4. **Create ADR-011:**
   - Document proxy → subdomain migration decision
   - Include performance metrics
   - Cost savings ($7/month eliminated)

---

## Cost Savings

- **Before:** Frontend ($7) + Proxy ($7) + Backend ($7) = **$21/month**
- **After:** Frontend ($7) + Backend ($7) = **$14/month**
- **Savings:** **$7/month** (33% reduction)

---

## Performance Improvements

- **Latency:** ~50-100ms reduction (eliminated proxy hop)
- **Reliability:** Removed single point of failure
- **Complexity:** Reduced from 3 services to 2

---

## References

- ADR-004: httpOnly Cookies Migration
- ADR-010: Scoring Architecture
- Render Docs: Custom Domains
- Cloudflare Docs: CNAME Records
