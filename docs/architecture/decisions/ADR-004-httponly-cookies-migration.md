# ADR-004: Migration to httpOnly Cookies

**Date**: November 27, 2025
**Implementation Date**: December 21, 2025
**Status**: ✅ Implemented (v1.8.0)
**Decision Makers**: Frontend + backend development team
**Supersedes**: ADR-003 (sessionStorage Authentication)
**Extended by**: ADR-011 (Subdomain Architecture with Cloudflare) - Cookie domain updated to `.rydercupfriends.com` for cross-subdomain support

## Context and Problem

ADR-003 implemented sessionStorage as a temporary solution for JWT tokens, but it presents critical vulnerabilities:

- **XSS Vulnerability**: JavaScript can access and steal tokens
- **No CSRF Protection**: Tokens accessible from any script
- **Manual Header Management**: Requires `Authorization: Bearer ${token}` in every request

**Requirements for migration:**
- Eliminate access to tokens from JavaScript
- Automatic XSS protection
- Simplify authentication (automatic cookies)
- Coordinate frontend + backend changes

## Options Considered

1. **httpOnly Cookies + CSRF Tokens**: Browser-managed cookies + anti-CSRF token
2. **httpOnly Cookies + SameSite**: Cookies with `samesite=lax` flag (no CSRF token)
3. **Keep sessionStorage + strict CSP**: Improve CSP but maintain vulnerability

## Decision

**We adopt httpOnly Cookies + SameSite=lax** for v1.8.0:

### Backend Changes (FastAPI):
```python
# src/modules/auth/infrastructure/api/auth_routes.py
from fastapi import Response

@app.post("/api/v1/auth/login")
async def login(credentials: LoginRequest, response: Response):
    token = create_access_token(user.id)

    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,   # ✅ Not accessible from JavaScript
        secure=True,     # ✅ HTTPS only in production
        samesite="lax",  # ✅ Basic CSRF protection
        max_age=3600,    # 1 hour
        path="/",
        domain=None      # Automatic
    )

    # Do NOT send token in response body
    return {"user": user_dto}  # Without access_token
```

### Authentication Middleware:
```python
# src/shared/infrastructure/middleware/auth_middleware.py
from fastapi import Request, HTTPException

def extract_token_from_cookies(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return token

# Replace reading from Authorization header
```

### Frontend Changes (React):
```javascript
// src/utils/secureAuth.js - REMOVE this file completely
// setAuthToken/getAuthToken no longer needed

// src/infrastructure/*/Api*Repository.js
fetch(url, {
    method: 'POST',
    credentials: 'include',  // ✅ Sends cookies automatically
    headers: {
        'Content-Type': 'application/json'
        // Do NOT include Authorization header
    },
    body: JSON.stringify(data)
})
```

## Rationale

### Advantages of httpOnly Cookies:

| Aspect | httpOnly Cookies | sessionStorage (previous) |
|---------|------------------|------------------------|
| **XSS Protection** | ✅ Immune | ❌ Vulnerable |
| **CSRF Protection** | ✅ SameSite=lax | ❌ No |
| **Automatic handling** | ✅ Browser | ❌ Manual |
| **Complexity** | ✅ Lower | ⚠️ Higher |
| **Logout** | ✅ Server-side | ⚠️ Client-side |

### Why NOT CSRF Tokens (initially):

- `samesite=lax` provides basic CSRF protection
- Simplifies initial implementation
- CSRF tokens can be added later if needed (future ADR)

### Compatibility:

- ✅ All modern browsers support httpOnly
- ✅ Compatible with fetch API with `credentials: 'include'`
- ✅ Works in development (localhost) and production (HTTPS)

## Consequences

### Positive:
- ✅ **Eliminates XSS token theft**: JavaScript cannot read cookies
- ✅ **Basic CSRF**: SameSite=lax prevents cross-site attacks
- ✅ **Simpler code**: No manual token management
- ✅ **Server-side logout**: Backend can invalidate cookies
- ✅ **HTTPS enforcement**: `secure=true` forces HTTPS

### Negative:
- ❌ **Requires coordinated changes**: Frontend + Backend simultaneously
- ❌ **Stricter CORS**: Requires `credentials: 'include'` in all requests
- ❌ **More complex testing**: Cookies in tests require configuration
- ❌ **Does not persist across tabs**: Similar to current sessionStorage

### Mitigated Risks:

1. **XSS Attacks**: Tokens inaccessible from JavaScript
2. **CSRF Attacks**: SameSite=lax prevents basic attacks
3. **Token Leakage**: Cookies are not exposed in logs/console

## Migration Plan

### Phase 1: Backend (Week 1)
1. Implement `set_cookie` in login/register/verify-email
2. Modify auth middleware to read from cookies
3. Maintain temporary compatibility with `Authorization` headers
4. Deploy to staging
5. Exhaustive testing

### Phase 2: Frontend (Week 2)
1. Add `credentials: 'include'` in all repositories
2. Remove `src/utils/secureAuth.js`
3. Remove sessionStorage read/write operations
4. Update tests
5. Deploy to staging
6. Joint testing with backend

### Phase 3: Cleanup (Week 3)
1. Remove `Authorization` header support in backend
2. Verify no legacy code remains
3. Coordinated production deploy
4. Monitor errors with Sentry

### Files to Modify:

**Backend:**
- `src/modules/auth/infrastructure/api/auth_routes.py` (login, register, verify)
- `src/shared/infrastructure/middleware/auth_middleware.py`
- `src/shared/infrastructure/security/jwt_handler.py`
- Authentication tests

**Frontend:**
- `src/infrastructure/auth/ApiAuthRepository.js`
- `src/infrastructure/user/ApiUserRepository.js`
- `src/infrastructure/competition/ApiCompetitionRepository.js`
- `src/infrastructure/enrollment/ApiEnrollmentRepository.js`
- `src/pages/Login.jsx` (do not save token)
- `src/pages/Register.jsx` (do not save token)
- `src/utils/secureAuth.js` (REMOVE)

## Validation

Success criteria:

- [x] Token not accessible from JavaScript (DevTools → Application → Cookies)
- [x] Login functional without sessionStorage
- [x] API requests include cookies automatically
- [x] useAuth() hook replaces sessionStorage logic
- [x] All repositories use `credentials: 'include'`
- [x] Authentication tests updated
- [x] No CORS errors in development

### Implementation Status:

**✅ Completed (December 21, 2025):**
- Created hook `src/hooks/useAuth.js` that calls `/api/v1/auth/current-user`
- Updated `src/services/api.js` with `credentials: 'include'`
- Migrated all repositories (Auth, User, Competition, Enrollment, Handicap)
- Updated use cases (Login, Competition lifecycle)
- Removed references to `secureAuth.js` in production code
- Updated `src/App.jsx` to use `useAuth()`
- Updated `src/components/layout/HeaderAuth.jsx`
- Login functional with httpOnly cookies

### Testing Checklist:

```javascript
// ❌ This must FAIL (token inaccessible)
console.log(sessionStorage.getItem('auth_token')); // null

// ✅ This must WORK (automatic cookie)
fetch('http://localhost:8000/api/v1/auth/current-user', {
    credentials: 'include'
}).then(res => res.json());
```

## References

- [OWASP: JWT Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [FastAPI Cookies](https://fastapi.tiangolo.com/advanced/response-cookies/)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)
- ADR-003: sessionStorage Authentication (superseded)
- Backend ROADMAP: "httpOnly Cookies" section

## Implementation Notes

### CORS Configuration (Backend):

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://rydercup.com"],
    allow_credentials=True,  # ✅ REQUIRED for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Local Development (HTTP):

- `secure=False` in development (localhost HTTP)
- `secure=True` in production (HTTPS)
- Use environment variable: `COOKIE_SECURE=os.getenv("ENV") == "production"`

### Logout Implementation:

```python
@app.post("/api/v1/auth/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        domain=None
    )
    return {"message": "Logged out successfully"}
```

### Frontend Logout:

```javascript
// src/pages/Dashboard.jsx
const handleLogout = async () => {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
    });

    // Clear localStorage (user data)
    localStorage.removeItem('user');
    navigate('/');
};
```

## Related

- ADR-003: sessionStorage Authentication (superseded by this ADR)
- ADR-005: Sentry Error Tracking (post-migration monitoring)
- SECURITY_MIGRATION.md: Detailed migration guide
- ROADMAP.md: v1.8.0 Security Release
