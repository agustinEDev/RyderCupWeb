# Integration Tests with Backend

> **ROADMAP Task #11**
> **Date:** Dec 23-24, 2025 (auth flows) | Pending: schedule flows (v2.1.0)
> **Status:** ✅ AVAILABLE - Only for manual local execution
> **Goal:** Verify complete Frontend-Backend integration

## ⚠️ IMPORTANT

**Integration tests are NOT executed in CI/CD.**

These tests are available only for **manual local execution** when you need to validate integration with the real backend.

**Reason:** The complexity of maintaining a mock backend in CI does not justify the benefit, since:
- Unit tests cover >90% of the code
- The real backend must be running (we cannot guarantee this in CI)
- Mocks add complexity without providing real confidence in integration

## ✅ Current Status

**Tests implemented:** 8 E2E tests
**Execution:** Local only (with real backend running)
**Execution time:** ~26 seconds

**To run these tests you need:**
1. ✅ Node.js 20+
2. ✅ Real backend running at `http://localhost:8000`
3. ✅ Environment variables configured: `TEST_EMAIL` and `TEST_PASSWORD`
4. ✅ Valid test user in the backend

**Credentials configuration:**
```bash
# Option 1: .env file (recommended)
cp .env.example .env
# Edit .env and configure TEST_EMAIL and TEST_PASSWORD

# Option 2: Inline environment variables
TEST_EMAIL=your-test@example.com TEST_PASSWORD=YourTestPassword123 npm run test:integration
```

## 📋 Implemented Test Suite

File: [`tests/integration.spec.js`](../tests/integration.spec.js)

### 1️⃣ httpOnly Cookies - Basic Login (2 tests)

Verifies authentication and httpOnly cookies handling:

- ✅ **Login successfully and receive cookies**
  - Verifies successful login with valid credentials
  - Confirms that cookies are received: `access_token`, `refresh_token`
  - Validates redirection to `/dashboard`
  
- ✅ **Maintain authentication across navigation**
  - Navigates to protected routes (`/profile`) using cookies
  - Verifies that user data is displayed correctly
  - Confirms authentication persistence

### 2️⃣ Backend Validation - Login (1 test)

Verifies backend validations in login process:

- ✅ **Reject login with incorrect password**
  - Attempts login with incorrect password
  - Verifies that it remains on login page
  - Confirms visible error message

### 3️⃣ Backend Validation - Registration (2 tests)

Verifies registration form validations:

- ✅ **Reject registration with short password**
  - Attempts registration with password < 12 characters
  - Verifies length validation message
  
- ✅ **Validate registration form fields**
  - Verifies presence of all form fields
  - Fills form with valid data
  - Confirms absence of frontend validation errors

### 4️⃣ Complete E2E Flow (1 test)

Verifies the complete authenticated user flow:

- ✅ **Login → dashboard → profile → competitions flow**
  1. Successful login with valid credentials
  2. Redirection to `/dashboard`
  3. Navigation to `/profile` - user data visible
  4. Navigation to `/competitions` - page loads correctly
  5. Cookies maintain session across all navigations

### 5️⃣ Session Persistence (1 test)

Verifies session persistence with httpOnly cookies:

- ✅ **Maintain session across page reload**
  - Successful login
  - Reloads the page (F5)
  - Session is maintained (remains on `/dashboard`)
  - Cookies persist after reload

## 🚀 Test Execution

### Available Commands

```bash
# Run all integration tests
npm run test:integration

# Run all E2E tests (includes other tests)
npm run test:e2e

# Interactive mode with UI
npm run test:e2e:ui

# View browser during execution
npm run test:e2e:headed
```

### Important Configuration

**Playwright Config (`playwright.config.js`):**
```javascript
{
  workers: 1,              // ⚠️ CRITICAL: Execute in series to avoid rate limiting
  fullyParallel: false,    // Disable parallelization
  baseURL: 'http://localhost:5173',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
}
  
- ✅ **Handle authentication throughout competitions flow**
  - `/competitions` accessible
  - `/competitions/browse` accessible
  - `/competitions/create` accessible

### 5️⃣ Session Timeout & Inactivity (2 tests)

Verifies session persistence:

- ✅ **Maintain session across page reloads**
  - Page reload maintains active session
  - Dashboard remains accessible without re-login
  
- ✅ **Maintain session across tab/window close simulation**
  - Cookies persist after closing tab
  - Simulates real browser behavior

## 🚀 Run Tests

### ⚠️ Prerequisites

**1. Install browsers (first time only):**

```bash
npx playwright install chromium
```

**2. Backend MUST be running:**

⚠️ **CRITICAL:** Integration tests require the real backend to be active.

```bash
# In the backend repository (RyderCupAm)
cd ../RyderCupAm
source venv/bin/activate  # or the environment you use
uvicorn app.main:app --reload

# Verify that it responds
curl http://localhost:8000/api/v1/health
```

**Important:** If the backend is not running, tests will fail.

**3. Configure test credentials:**

⚠️ **IMPORTANT:** Credentials are read from environment variables for greater security.

```bash
# Option 1: Create .env file (recommended)
cp .env.example .env

# Edit .env and configure:
TEST_EMAIL=your-test-user@example.com
TEST_PASSWORD=YourTestPassword123

# Option 2: Export inline variables
export TEST_EMAIL=your-test-user@example.com
export TEST_PASSWORD=YourTestPassword123
npm run test:integration
```

**The test user must:**
- Exist in your development/testing backend
- Have verified email
- Use dedicated credentials (NOT personal/production)

**If you don't have a test user:**
1. Register it manually in the local frontend
2. Verify the email
3. Configure those credentials in `.env`

### All E2E tests

```bash
npm run test:e2e
```

### Integration tests only

```bash
npm run test:integration
```

### In UI mode (interactive)

```bash
npm run test:e2e:ui
```

### View browser (headed mode)

```bash
npm run test:e2e:headed
```

### Specific by describe block

```bash
npx playwright test -g "httpOnly Cookies"
npx playwright test -g "Refresh Token Flow"
npx playwright test -g "Backend Validation"
npx playwright test -g "Complete E2E Flow"
```

## ⚙️ Configuration

**File:** `playwright.config.js`

```javascript
{
  baseURL: 'http://localhost:5174',
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
  }
}
```

## 📊Se Test Coverage

| Backend v1.8.0 Feature | Tests | Status |
|------------------------|-------|--------|
| httpOnly Cookies | 3 | ✅ |
| Refresh Token Flow | 2 | ✅ |
| Password Policy (12 chars) | 1 | ✅ |
| Email Validation (RFC 5321) | 1 | ✅ |
| Name Validation (2-100 chars) | 2 | ✅ |
| Names with Accents | 1 | ✅ |
| Session Persistence | 2 | ✅ |
| Protected Routes | 3 | ✅ |
| **Total** | **15** | **✅ 100%** |

## 🎯 Validation Checklist

- [x] httpOnly cookies are stored correctly
- [x] Cookies are sent automatically with requests
- [x] Cookies are cleared after logout
- [x] Refresh token flow works automatically
- [x] Redirection to login when refresh token is invalid
- [x] Backend rejects short passwords (< 12 chars)
- [x] Backend rejects invalid emails
- [x] Backend rejects excessively long names (> 100 chars)
- [x] Backend accepts names with accents and special characters
- [x] Complete flow works: login → dashboard → profile → edit → logout
- [x] Session persists after page reload
- [x] Protected routes redirect to login without authentication

## 🔍 Technical Notes

### User Credentials for Tests

🔒 **Security:** Credentials are loaded from environment variables.

```javascript
// En tests/integration.spec.js
const { email, password } = getTestCredentials();

// getTestCredentials() reads from:
// - process.env.TEST_EMAIL
// - process.env.TEST_PASSWORD
```

**⚠️ Important:**
- The user must exist in the test backend and be verified
- Credentials should NEVER be hardcoded in the code
- Use dedicated credentials for testing (NOT personal/production)

### Timeout Considerations

- Login/Dashboard redirect: 10 seconds
- Page navigation: 5 seconds
- Element visibility: 3 seconds (validations)
- Reason: Backend may be in "cold start" (Render.com)

### Cookie Debugging

Tests include cookie logging:

```javascript
console.log('🍪 Cookies after login:', cookies.map(c => ({ 
  name: c.name, 
  httpOnly: c.httpOnly,
  secure: c.secure,
  sameSite: c.sameSite 
})));
```

### Fallbacks in UI Testing

Some elements may have different selectors depending on the UI state:

```javascript
// Example: Logout button
await page.click('[data-testid="user-menu-button"]').catch(() => {
  return page.click('button:has-text("Settings")').catch(() => {
    return page.click('[aria-label*="user" i]');
  });
});
```

## 🐛 Troubleshooting

### Error: Login fails / Remains on /login page

**Problem:** Tests expect to reach `/dashboard` but stay on `/login`.

**Possible causes:**
1. Backend is not running
2. Test user does not exist
3. Incorrect credentials
4. Backend in cold start (Render.com)

**Solution:**
```bash
# 1. Verify backend
curl http://localhost:8000/health

# 2. Verify credentials in your backend
# Register user manually if it doesn't exist

# 3. Or update credentials in tests/integration.spec.js
# Search for: panetetrinx@gmail.com
# Replace with your test user
```

### Error: Timeout waiting for webServer

**Problem:** Dev server did not start in time.

**Solution:**
```bash
# Start server manually in another terminal
npm run dev

# Run tests without webServer
npx playwright test --config playwright.config.js
```

### Error: Missing test credentials

**Problem:** Environment variables `TEST_EMAIL` or `TEST_PASSWORD` are not configured.

**Error shown:**
```
Missing test credentials. Please set TEST_EMAIL and TEST_PASSWORD environment variables.
```

**Solution:**
```bash
# Create .env file with credentials
cp .env.example .env
# Edit .env and configure TEST_EMAIL and TEST_PASSWORD
```

### Error: User not found / Invalid credentials

**Problem:** Test user does not exist in backend or incorrect credentials.

**Solution:**
1. Verify that the user exists in the backend
2. Verify that the email is verified
3. Register new user if necessary
4. Update credentials in `.env`

### Tests fail in CI but pass locally

**Problem:** Timing differences (backend cold start).

**Solution:**
- Increase timeouts in `playwright.config.js`
- Configure retries: `retries: 2` in CI

## 📚 References

- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- Backend API Spec (see backend repo `docs/API.md`)
- [Token Refresh Interceptor](../src/utils/tokenRefreshInterceptor.js)
- [ROADMAP Task #11](../ROADMAP.md#tarea-11)

## ✅ Result

**15 tests implemented** covering:
- ✅ httpOnly cookies
- ✅ Automatic refresh token flow
- ✅ Backend validations
- ✅ Complete E2E flow
- ✅ Session persistence

**Execution status:**
- ⚠️ **Requires active backend** at `http://localhost:8000`
- ⚠️ **Requires environment variables** `TEST_EMAIL` and `TEST_PASSWORD` configured
- ⚠️ **Requires verified test user** in the backend
- ✅ **Tests ready for CI/CD** once backend is in production
- ✅ **Frontend-Backend Integration: Auth flows 100% implemented**

**Suggested next steps:**
1. ✅ ~~Configure environment variables for test credentials~~ (Implemented)
2. Automatically create test user in setup
3. Consider using [MSW](https://mswjs.io/) for backend mock in tests
4. Run tests against backend in CI/CD
5. **v2.1.0 - Schedule Integration Tests (pending):**
   - Test create round and verify in schedule
   - Test generate matches for a round
   - Test match lifecycle (SCHEDULED -> IN_PROGRESS -> COMPLETED)
   - Test declare walkover and verify formatted result (score, winner, reason)
   - Test assign teams (manual/automatic)
   - Test reassign players in a match
   - Test enrollment with tee category (EnrollmentRequestModal flow)
   - Test enrolled player accesses `/competitions/:id/schedule` (read-only view, no management buttons)
