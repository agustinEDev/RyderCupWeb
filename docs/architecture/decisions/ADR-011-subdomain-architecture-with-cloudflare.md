# ADR-011: Subdomain Architecture with Cloudflare DNS

**Date:** 2026-02-03
**Last verified:** 2026-08-04
**Status:** Accepted
**Related:** ADR-004 (httpOnly Cookies), ADR-009 (RBAC)

## Context

Previous architecture used reverse proxy: `www.rydercupfriends.com/api/*` → Backend proxy service → Backend.

**Problems:** +50-100ms latency, single point of failure, $7/month cost, cookie domain rewriting complexity.

## Decision

Subdomain architecture: Frontend (`www`) + Backend API (`api`) as separate subdomains, both
served by Render and resolved through Cloudflare DNS.

**DNS (Cloudflare):**
- `www` → Frontend, CNAME to Render, **DNS only** ☁️
- `api` → Backend, CNAME to Render, **DNS only** ☁️

Neither subdomain is proxied through Cloudflare. Traffic goes straight to Render.

**Backend cookies:** `Domain=.rydercupfriends.com` (leading dot for cross-subdomain)

**Backend CORS:** `FRONTEND_ORIGINS=https://www.rydercupfriends.com`, `allow_credentials=True`

**Backend IP:** `cf_ip = request.headers.get("CF-Connecting-IP")` with fallback chain to
`True-Client-IP` → `X-Forwarded-For` → `X-Real-IP`. Since neither subdomain is proxied,
**Cloudflare does not supply `CF-Connecting-IP`** and the fallback is what actually runs.
Low impact: device identification moved to the `device_id` cookie in v2.0.4, so IP is only
kept for the audit trail.

**Frontend build:** Render env var `VITE_API_BASE_URL=https://api.rydercupfriends.com` (Vite auto-exposes to `import.meta.env`)

**Security headers:** served by Render, not by Cloudflare. See `docs/SECURITY_HEADERS.md`.

## Consequences

**Positive:**
- ✅ Performance: -50-100ms latency (no proxy hop)
- ✅ Cost: -$7/month (33% reduction)
- ✅ Reliability: Removed single point of failure
- ✅ Simplicity: no proxy configuration or cache rules to maintain

**Negative:**
- ⚠️ No Cloudflare WAF, DDoS protection or caching in front of the app
- ⚠️ **Cloudflare Transform Rules do not apply**, so they cannot be used to inject
  security headers or rewrite anything — the traffic never reaches the proxy
- ⚠️ Real client IP depends on Render's `X-Forwarded-For` rather than `CF-Connecting-IP`

**Enabling the proxy later** would restore WAF, caching and Transform Rules, but requires
checking the SSL/TLS mode (`Full (strict)`) and confirming it does not interfere with the
certificate Render manages for the domain.

## Note on `cf-*` response headers

Responses include `cf-ray`, `server: cloudflare` and `cf-cache-status` **even though the
domains are not proxied**, because Render fronts its own services with Cloudflare. Those
headers say nothing about this account's proxy status — check the DNS record instead. This
misreading cost a full debugging cycle in #295.

## References

- ADR-004: httpOnly Cookies Migration
- `docs/SECURITY_HEADERS.md` — where security headers actually come from
- [Cloudflare Proxy](https://developers.cloudflare.com/fundamentals/concepts/how-cloudflare-works/)
- [CORS with Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
