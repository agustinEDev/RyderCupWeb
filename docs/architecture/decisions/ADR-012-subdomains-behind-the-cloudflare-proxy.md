# ADR-012: Subdomains behind the Cloudflare Proxy

**Date**: November 17, 2026
**Status**: Accepted (Implemented in November 2026)
**Decision Makers**: Frontend + backend development team
**Supersedes**: ADR-011 (Subdomain Architecture with Cloudflare DNS; removed on November 17, 2026)
**Related**: ADR-004 (httpOnly Cookies), backend ADR-041 (real client IP behind Cloudflare)

## Context and Problem

ADR-011 split the app into `www` (frontend) and `api` (backend), both on Render, with both
DNS records **not proxied** by Cloudflare. The split still holds, but the "DNS only" part
was reversed during the security audits of November 2026, and several protections now
depend on the proxy. ADR-011 described the opposite of production, so it was removed.

**Requirements:**
- Nobody can call the API around the edge protections
- Security headers that Render cannot set per path (CORP on `/images/*`) or for the whole
  zone (HSTS)
- A cap on request bodies before they reach the backend
- Same cookies and CORS as ADR-004

## Options Considered

1. **DNS only** (ADR-011): traffic straight to Render, no edge rules
2. **Proxied by Cloudflare**: edge rules, WAF and an origin check
3. **A reverse proxy service of our own**: the setup ADR-011 replaced (cost and latency)

## Decision

**We put `www`, `api` and the root behind the Cloudflare proxy:**

- **SSL/TLS Full (strict).** `www` serves the frontend (Render Static Site), `api` the
  backend (Render Web Service), and the root redirects to `www`. The `onrender.com`
  subdomain of the API is disabled.
- **Origin check.** A request rule on the `api` host adds `X-Origin-Verify` with a secret
  that the backend checks (`CLOUDFLARE_ORIGIN_SECRET`).
- **Edge headers.** HSTS for the whole zone (12 months, `includeSubDomains`, no preload)
  and `Cross-Origin-Resource-Policy: cross-origin` on `/images/*` through a response rule.
  The other security headers still come from Render (`docs/SECURITY_HEADERS.md`).
- **Body size.** A WAF rule on `api` blocks bodies over 256 KB (10.5 MB for the avatar and
  photo uploads).
- **Cookies and CORS as in ADR-004:** `Domain=.rydercupfriends.com`; CORS allows
  `https://www.rydercupfriends.com` with credentials. The frontend calls
  `VITE_API_BASE_URL=https://api.rydercupfriends.com`.

Checked on November 17, 2026: `www`, `api` and the root resolve to Cloudflare addresses
with no CNAME to Render, and the API only answers requests that carry the origin header.

## Rationale

The audits asked for controls that only an edge can give at no extra cost: blocking oversized
bodies before they reach the backend, a per-path header, a zone-wide HSTS and the guarantee
that the origin is not reachable around them. A proxy of our own would bring back the cost
and latency ADR-011 removed.

## Consequences

### Positive:
- ✅ WAF, DDoS protection and edge rules in front of both subdomains
- ✅ The API cannot be called around them (origin check and `onrender.com` disabled)
- ✅ Headers that Render cannot express are set at the edge

### Negative (mitigated):
- ⚠️ One more hop than straight to Render (small latency)
- ⚠️ Some Spanish ISPs have blocked Cloudflare IP ranges during football broadcasts: the
  app can look down from Spain while working elsewhere. Check that first.
- ⚠️ The client IP comes from Cloudflare's header (backend ADR-041)

## References

- ADR-004: httpOnly Cookies Migration
- `docs/SECURITY_HEADERS.md` — which header comes from Render and which from Cloudflare
