# ADR-011: Subdomain Architecture with Cloudflare Proxy

**Date:** 2026-02-03
**Status:** Accepted
**Related:** ADR-004 (httpOnly Cookies), ADR-009 (RBAC)

## Context

Previous architecture used reverse proxy: `www.rydercupfriends.com/api/*` → Backend proxy service → Backend.

**Problems:** +50-100ms latency, single point of failure, $7/month cost, cookie domain rewriting complexity.

## Decision

Subdomain architecture with Cloudflare Proxy: Frontend (`www`) + Backend API (`api`) as separate subdomains.

**DNS (Cloudflare):**
- `www` → Frontend (DNS only ☁️)
- `api` → Backend (Proxied 🟧, provides real IPs via `CF-Connecting-IP`)

**Backend cookies:** `Domain=.rydercupfriends.com` (leading dot for cross-subdomain)

**Backend CORS:** `FRONTEND_ORIGINS=https://www.rydercupfriends.com`, `allow_credentials=True`

**Backend IP:** `cf_ip = request.headers.get("CF-Connecting-IP")` (fixes Render container IP issue)

**Frontend build:** Render env var `VITE_API_BASE_URL=https://api.rydercupfriends.com` (Vite auto-exposes to `import.meta.env`)

**Frontend CSP:** Updated `vite.config.js` to include `api.rydercupfriends.com` in `connect-src`

**Cloudflare:** Page Rule `api.rydercupfriends.com/*` → Cache: Bypass, Performance: Disabled

## Consequences

**Positive:**
- ✅ Performance: -50-100ms latency (no proxy hop)
- ✅ Cost: -$7/month (33% reduction)
- ✅ Reliability: Removed single point of failure
- ✅ Real IPs: `CF-Connecting-IP` fixes Render container IP issue → accurate device fingerprinting
- ✅ Security: OWASP 9.5/10 maintained, DDoS protection

**Negative:**
- ⚠️ Cloudflare dependency for API traffic
- ⚠️ Requires Page Rules configuration (no caching)

**Rollback:** Change DNS from Proxied (🟧) to DNS only (☁️) in 5 seconds.

## References

- ADR-004: httpOnly Cookies Migration
- [Cloudflare Proxy](https://developers.cloudflare.com/fundamentals/concepts/how-cloudflare-works/)
- [CORS with Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
