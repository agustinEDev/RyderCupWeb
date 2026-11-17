# ADR-012: Subdomains behind the Cloudflare Proxy

**Date:** 2026-11-17
**Status:** Accepted (replaces ADR-011, removed)
**Related:** ADR-004 (httpOnly cookies); backend ADR-041 (real client IP behind Cloudflare)

## Context

ADR-011 split the app into `www` (frontend) and `api` (backend), both on Render, with
both DNS records **not proxied**. The split still holds, but the "DNS only" part was
reversed during the security audits of November 2026: the records are proxied, and
several protections now depend on it. ADR-011 described the opposite of production, so
it was removed.

Checked on 17 Nov 2026: `www`, `api` and the root resolve to Cloudflare addresses with no
CNAME to Render visible, and the API only answers requests that carry the header the
Cloudflare rule adds.

## Decision

1. **Two subdomains, both proxied by Cloudflare.** `www` serves the frontend (Render
   Static Site) and `api` the backend (Render Web Service); the root redirects to `www`.
   SSL/TLS mode **Full (strict)**. The `onrender.com` subdomain of the API is disabled.
2. **Only Cloudflare reaches the API.** A request rule on the `api` host adds
   `X-Origin-Verify` with a secret that the backend checks (`CLOUDFLARE_ORIGIN_SECRET`).
3. **Some headers are set at the edge:** HSTS for the whole zone (12 months,
   `includeSubDomains`, no preload) and `Cross-Origin-Resource-Policy: cross-origin` on
   `/images/*` through a response rule. The rest of the security headers still come from
   Render (`docs/SECURITY_HEADERS.md`).
4. **A WAF rule caps request bodies on `api`** (256 KB, 10.5 MB for avatar and photo
   uploads).
5. **Cookies and CORS stay as in ADR-004:** cookies with `Domain=.rydercupfriends.com`;
   CORS allows `https://www.rydercupfriends.com` with credentials. The frontend calls
   `VITE_API_BASE_URL=https://api.rydercupfriends.com`.

## Consequences

- WAF, DDoS protection and edge rules are available, and the origin cannot be called
  around them.
- One more hop than direct-to-Render (small latency).
- Some Spanish ISPs have blocked Cloudflare IP ranges during football broadcasts: the app
  can look down from Spain while working elsewhere. Check that first.
- The client IP comes from Cloudflare's header (backend ADR-041).
