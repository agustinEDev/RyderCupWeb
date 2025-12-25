# Reverse Proxy for RyderCup

This proxy unifies the frontend and backend under the same domain to enable `SameSite=Lax` cookies.

## How it works

```
https://proxy.rydercupfriends.com/         → Frontend (React app)
https://proxy.rydercupfriends.com/api/*    → Backend API
```

## Render Configuration

**Service Type:** Web Service
**Runtime:** Node
**Build Command:** `cd proxy && npm install`
**Start Command:** `cd proxy && npm start`
**Root Directory:** `/`

**Environment Variables:**
- `BACKEND_URL`: https://rydercupam-euzt.onrender.com
- `FRONTEND_URL`: https://www.rydercupfriends.com

## Benefits

- ✅ Same domain → `SameSite=Lax` works
- ✅ CSRF protection with `SameSite=Lax`
- ✅ XSS protection with httpOnly cookies
- ✅ No code changes needed in frontend/backend
