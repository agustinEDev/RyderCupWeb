# Security Implementation Guide - Priority Tasks

## Overview
This document contains **critical security implementations** required for production. All tasks are ordered by priority and severity.

---

## 🔴 PRIORITY 1: CSRF Protection (CRITICAL - Not Implemented)

**Status:** ⚠️ NOT IMPLEMENTED
**Severity:** CRITICAL
**Time Estimate:** 4-6 hours (Backend + Frontend)
**Requires:** Backend coordination

### What is the risk?
Malicious websites can make unauthorized POST/PUT/PATCH/DELETE requests on behalf of authenticated users (change password, email, profile data).

### Backend Implementation

#### Step 1: Generate CSRF Token on Login
**File:** `backend/app/api/v1/auth.py`

```python
from fastapi import Response
import secrets

@router.post("/login")
async def login(credentials: LoginRequest, response: Response):
    # ... authentication logic ...

    csrf_token = secrets.token_urlsafe(32)

    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,  # Frontend needs to read it
        secure=True,
        samesite="strict",
        max_age=3600
    )

    return {
        "access_token": token,
        "csrf_token": csrf_token,
        "user": user_data
    }
```

#### Step 2: Create CSRF Validation Middleware
```python
from fastapi import Header, Cookie, HTTPException

async def verify_csrf_token(
    x_csrf_token: str = Header(None),
    csrf_cookie: str = Cookie(None)
):
    if not x_csrf_token or not csrf_cookie:
        raise HTTPException(403, "CSRF token missing")
    if x_csrf_token != csrf_cookie:
        raise HTTPException(403, "CSRF token invalid")
    return True
```

#### Step 3: Apply to Protected Endpoints
```python
@router.patch("/users/profile", dependencies=[Depends(verify_csrf_token)])
@router.patch("/users/security", dependencies=[Depends(verify_csrf_token)])
@router.post("/handicaps/update", dependencies=[Depends(verify_csrf_token)])
```

### Frontend Implementation

#### Step 1: Add CSRF Functions
**File:** `src/utils/secureAuth.js`

```javascript
const CSRF_TOKEN_KEY = 'csrf_token';

export const setCsrfToken = (token) => {
  if (!token) return;
  sessionStorage.setItem(CSRF_TOKEN_KEY, token);
};

export const getCsrfToken = () => {
  return sessionStorage.getItem(CSRF_TOKEN_KEY);
};

export const removeCsrfToken = () => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
};
```

#### Step 2: Save CSRF on Login
**File:** `src/pages/Login.jsx` (line 92-93)

```javascript
setAuthToken(data.access_token);
setUserData(data.user);
setCsrfToken(data.csrf_token);  // ADD THIS
```

#### Step 3: Include CSRF in Requests
**File:** `src/utils/secureAuth.js` - Update `authenticatedFetch`

```javascript
export const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const csrfToken = getCsrfToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return fetch(url, { ...options, headers });
};
```

#### Step 4: Clear CSRF on Logout
```javascript
export const clearAuthData = () => {
  removeAuthToken();
  removeUserData();
  removeCsrfToken();
};
```

### Testing
```bash
# Should fail (no CSRF)
curl -X PATCH http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer <token>" \
  -d '{"first_name":"Hacker"}'

# Should succeed (with CSRF)
curl -X PATCH http://localhost:8000/api/v1/users/profile \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf_token>" \
  -d '{"first_name":"John"}'
```

---

## 🔴 PRIORITY 2: httpOnly Cookies (CRITICAL - Interim Solution Active)

**Status:** ⚠️ TEMPORARY FIX (sessionStorage)
**Severity:** CRITICAL
**Time Estimate:** 6-8 hours (Backend + Frontend)
**Requires:** Backend coordination

### Current Situation
✅ **Interim Fix:** Migrated from `localStorage` to `sessionStorage` (better, but still XSS-vulnerable)
❌ **Permanent Fix:** httpOnly cookies (NOT yet implemented)

### Why httpOnly Cookies?
- JavaScript **cannot access** them (XSS-proof)
- Automatically sent with requests
- Cleared on logout server-side

### Backend Implementation

#### Step 1: Login Returns Cookie (Not Token in Body)
```python
@router.post("/login")
async def login(credentials: LoginRequest, response: Response):
    token = create_access_token(user.id)

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,   # JavaScript CANNOT access
        secure=True,
        samesite="strict",
        max_age=3600,
        path="/"
    )

    return {"user": user_data}  # NO token in response
```

#### Step 2: Read Token from Cookie
```python
from fastapi import Cookie

def get_current_user(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(401, "Not authenticated")
    # ... validate token ...
```

#### Step 3: Logout Endpoint
```python
@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="strict",
        path="/"
    )
    return {"message": "Logged out"}
```

#### Step 4: Update CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,  # REQUIRED for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
```

### Frontend Implementation

#### Step 1: Remove Token Storage
**Files:** `Login.jsx`, `secureAuth.js`

```javascript
// REMOVE:
setAuthToken(data.access_token);

// Backend sets cookie automatically
```

#### Step 2: Add credentials: 'include'
**File:** `src/utils/secureAuth.js`

```javascript
export const authenticatedFetch = async (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include',  // Sends httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
};
```

#### Step 3: Remove Authorization Header
```javascript
// REMOVE:
headers['Authorization'] = `Bearer ${token}`;

// Token sent automatically via cookie
```

---

## 🟡 PRIORITY 3: Completed Improvements

### ✅ 1. NPM Dependencies Updated
- ✅ js-yaml updated to 4.1.1+
- ✅ vite updated to 7.2.2
- ✅ esbuild fixed (transitive)
- ✅ **0 vulnerabilities**

### ✅ 2. Content Security Policy (CSP)
**File:** `index.html`

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; ..." />
```

### ✅ 3. Input Sanitization Improved
**File:** `src/utils/validation.js`

```javascript
export const sanitizeInput = (input) => {
  const htmlEntities = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#x27;', '/': '&#x2F;'
  };
  return input.replace(/[&<>"'\/]/g, char => htmlEntities[char]).trim();
};
```

### ✅ 4. Security Headers Added
**File:** `vite.config.js`

- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Strict-Transport-Security
- ✅ Referrer-Policy
- ✅ Permissions-Policy

---

## 📋 Implementation Checklist

### Phase 1: CSRF Protection (Week 1)
**Backend:**
- [ ] Generate CSRF token in `/login`
- [ ] Create `verify_csrf_token` middleware
- [ ] Apply to `/users/profile`, `/users/security`, `/handicaps/*`
- [ ] Test with curl

**Frontend:**
- [ ] Add CSRF functions to `secureAuth.js`
- [ ] Update `Login.jsx` to save CSRF
- [ ] Update `authenticatedFetch` to include `X-CSRF-Token`
- [ ] Update `clearAuthData` to remove CSRF
- [ ] Test in browser

### Phase 2: httpOnly Cookies (Week 2-3)
**Backend:**
- [ ] Update `/login` to set httpOnly cookie
- [ ] Update `get_current_user` to read from cookie
- [ ] Create `/logout` endpoint
- [ ] Update CORS with `allow_credentials=True`
- [ ] Test cookie flow

**Frontend:**
- [ ] Remove `setAuthToken()` from Login
- [ ] Add `credentials: 'include'` to all fetches
- [ ] Remove `Authorization` header construction
- [ ] Update logout to call backend `/logout`
- [ ] Test complete flow

### Phase 3: Testing (Ongoing)
- [ ] CSRF: Request without token fails (403)
- [ ] CSRF: Request with token succeeds (200)
- [ ] httpOnly: Token not visible in DevTools
- [ ] httpOnly: Logout clears cookie
- [ ] Security headers present in response
- [ ] CSP blocks inline scripts
- [ ] XSS attempts are escaped

---

## 📊 Security Score

**Before Improvements:** 3.5/10
**After Completed Tasks:** 6.5/10
**After CSRF + httpOnly:** 8.5/10

---

## 🔗 References

- [OWASP: CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP: Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)

---

**Last Updated:** 2025-11-17
**Version:** 2.0
