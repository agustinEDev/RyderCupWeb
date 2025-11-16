# Security Migration: localStorage to httpOnly Cookies

## Current Security Issue

**Problem:** JWT tokens stored in `localStorage` are vulnerable to XSS attacks. Any malicious script can access `localStorage` and steal authentication tokens.

**Impact:** High - Complete account takeover possible if XSS vulnerability exists.

## Recommended Solution: httpOnly Cookies

### Backend Changes Required

The backend must be updated to use httpOnly cookies instead of returning tokens in the response body.

#### 1. Login Endpoint Changes

**Current (FastAPI):**
```python
@router.post("/login")
async def login(credentials: LoginRequest):
    # ... authentication logic ...
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data
    }
```

**Required:**
```python
from fastapi import Response

@router.post("/login")
async def login(credentials: LoginRequest, response: Response):
    # ... authentication logic ...
    token = create_access_token(user.id)

    # Set httpOnly cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,      # Cannot be accessed by JavaScript
        secure=True,        # Only sent over HTTPS
        samesite="strict",  # CSRF protection
        max_age=3600,       # 1 hour
        path="/"
    )

    # Return only user data (no token in body)
    return {
        "user": user_data,
        "message": "Login successful"
    }
```

#### 2. Protected Endpoints Changes

**Current:**
```python
def get_current_user(token: str = Depends(oauth2_scheme)):
    # Expects: Authorization: Bearer <token>
    ...
```

**Required:**
```python
from fastapi import Cookie

def get_current_user(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # ... validate token ...
```

#### 3. Logout Endpoint

**Add new endpoint:**
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
    return {"message": "Logged out successfully"}
```

#### 4. CORS Configuration

**Update CORS settings:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific origins only
    allow_credentials=True,  # IMPORTANT: Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
```

### Frontend Changes Required

#### 1. Remove localStorage Usage

**Files to update:**
- `src/pages/Login.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Profile.jsx`
- `src/pages/EditProfile.jsx`
- `src/utils/auth.js`

**Change from:**
```javascript
localStorage.setItem('access_token', token);
localStorage.getItem('access_token');
localStorage.removeItem('access_token');
```

**Change to:**
```javascript
// NO localStorage for tokens
// Tokens handled automatically via httpOnly cookies
// Only store non-sensitive user data in sessionStorage
```

#### 2. Update API Calls

**All fetch calls must include:**
```javascript
fetch(url, {
    method: 'POST',
    credentials: 'include',  // CRITICAL: Send cookies
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
})
```

#### 3. User Data Storage

**Interim solution (current):**
- Use `sessionStorage` for user data (cleared on tab close)
- Refresh user data from `/api/v1/auth/current-user` on page load

**Future solution:**
- Store minimal user state in memory (React Context/State)
- Fetch user data on mount
- No persistent storage for sensitive data

## Migration Steps

### Phase 1: Frontend Preparation (Can do now)

1. ✅ Strengthen CSP (already done)
2. ✅ Input sanitization (already done)
3. ⏳ Move token storage from localStorage to sessionStorage (temporary)
4. ⏳ Add `credentials: 'include'` to all API calls
5. ⏳ Create auth context for in-memory user state

### Phase 2: Backend Updates (Requires backend changes)

1. Update login endpoint to set httpOnly cookie
2. Update protected endpoints to read cookie
3. Add logout endpoint
4. Update CORS to allow credentials
5. Test with frontend

### Phase 3: Final Frontend Updates

1. Remove all token storage (rely on cookies)
2. Remove Authorization header construction
3. Update logout to call logout endpoint
4. Test complete flow

## Interim Security Measures (Current)

Until backend is updated with httpOnly cookies:

1. ✅ **Strict CSP** - Blocks inline scripts, limits XSS surface
2. ✅ **Input sanitization** - All user inputs sanitized
3. ⏳ **sessionStorage migration** - Token cleared on tab close (better than localStorage)
4. ✅ **Token validation** - Strict exp validation
5. ✅ **HTTPS only** - Secure transport

## Testing Checklist

### Backend Tests
- [ ] Login sets httpOnly cookie
- [ ] Cookie has Secure flag
- [ ] Cookie has SameSite=strict
- [ ] Protected endpoints read cookie
- [ ] Logout clears cookie
- [ ] CORS allows credentials

### Frontend Tests
- [ ] Login successful without localStorage
- [ ] API calls work with credentials: 'include'
- [ ] User state persists across page refresh
- [ ] Logout clears session
- [ ] No token visible in DevTools → Application → Storage

## References

- [OWASP: Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
