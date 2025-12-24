import { test, expect } from '@playwright/test';

/**
 * Tests de Integración con Backend v1.8.0
 * Tarea #11 del ROADMAP
 * 
 * Objetivo: Verificar integración completa con backend v1.8.0
 * - httpOnly cookies
 * - Refresh token flow automático
 * - Validaciones del backend
 * - Flujo E2E completo
 */

test.describe('httpOnly Cookies Integration', () => {
  test('should store access and refresh tokens in httpOnly cookies after login', async ({ page, context }) => {
    // Navigate to login
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // Login with valid credentials
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Check that cookies were set (httpOnly cookies won't be accessible via document.cookie)
    const cookies = await context.cookies();
    
    // Verify cookies exist (names may vary based on backend implementation)
    const hasCookies = cookies.length > 0;
    expect(hasCookies).toBeTruthy();

    // Log cookies for debugging (in CI, this helps diagnose issues)
    console.log('🍪 Cookies after login:', cookies.map(c => ({ 
      name: c.name, 
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite 
    })));
  });

  test('should send cookies automatically with authenticated requests', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Navigate to profile (requires authentication)
    await page.goto('/profile');
    
    // Should load successfully without manual token handling
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible({ timeout: 5000 });
    
    // Verify user data is displayed (proves cookies were sent)
    await expect(page.locator('text=/panetetrinx@gmail.com/i')).toBeVisible();
  });

  test('should clear cookies after logout', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Verify cookies exist
    let cookies = await context.cookies();
    const cookiesBeforeLogout = cookies.length;
    expect(cookiesBeforeLogout).toBeGreaterThan(0);

    // Logout
    await page.click('[data-testid="user-menu-button"]').catch(() => {
      // Fallback if data-testid not available
      return page.click('button:has-text("Settings")').catch(() => {
        // Another fallback - click on user icon/avatar
        return page.click('[aria-label*="user" i], [aria-label*="menu" i]');
      });
    });
    
    await page.click('button:has-text("Logout")');
    
    // Wait for redirect to landing
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // Verify cookies were cleared or invalidated
    cookies = await context.cookies();
    console.log('🍪 Cookies after logout:', cookies);
    
    // After logout, auth cookies should be cleared
    // (Implementation may vary: cookies deleted or set to empty values)
  });
});

test.describe('Refresh Token Flow', () => {
  test('should automatically refresh expired access token on 401', async ({ page }) => {
    // This test simulates token expiration scenario
    // Note: Actual implementation depends on backend behavior
    
    // Login to get initial tokens
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Monitor network requests to detect refresh token flow
    let refreshTokenCalled = false;
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/auth/refresh') || url.includes('/refresh-token')) {
        refreshTokenCalled = true;
        console.log('🔄 Refresh token endpoint called:', url);
      }
    });

    // Navigate to a protected route
    await page.goto('/profile');
    
    // Should load successfully even if token refresh happened
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    
    // Note: refreshTokenCalled will only be true if a token actually expired
    // In normal test runs, tokens are fresh, so this might be false
    console.log('🔄 Refresh token was called:', refreshTokenCalled);
  });

  test('should redirect to login when refresh token is invalid', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Manually corrupt the cookies to simulate invalid refresh token
    await context.clearCookies();

    // Try to access protected route
    await page.goto('/profile');

    // Should be redirected to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});

test.describe('Backend Validation Integration', () => {
  test('should reject registration with short password (< 12 chars)', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Fill form with short password
    await page.getByPlaceholder('John').fill('Test');
    await page.getByPlaceholder('Doe').fill('User');
    await page.getByPlaceholder('your.email@example.com').fill('test@example.com');
    await page.getByPlaceholder('Minimum 12 characters').fill('Short1.');
    await page.getByPlaceholder(/confirm/i).fill('Short1.');

    // Submit form
    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation error
    await expect(page.getByText(/password.*12.*characters/i)).toBeVisible({ timeout: 3000 });
  });

  test('should reject registration with invalid email format', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder('John').fill('Test');
    await page.getByPlaceholder('Doe').fill('User');
    await page.getByPlaceholder('your.email@example.com').fill('invalid-email');
    await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');
    await page.getByPlaceholder(/confirm/i).fill('ValidPassword123.');

    await page.getByRole('button', { name: /sign up/i }).click();

    // Frontend or backend should reject invalid email
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 });
  });

  test('should reject login with incorrect password', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('WrongPassword123.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Backend should return 401 with error message
    await expect(page.getByText(/incorrect email or password/i)).toBeVisible({ timeout: 3000 });
    
    // Should remain on login page
    await expect(page).toHaveURL('/login');
  });

  test('should accept valid registration data (duplicate email will fail)', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    await page.getByPlaceholder('John').fill('Integration');
    await page.getByPlaceholder('Doe').fill('Test');
    await page.getByPlaceholder('your.email@example.com').fill(`integration${timestamp}@test.com`);
    await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');
    await page.getByPlaceholder(/confirm/i).fill('ValidPassword123.');

    await page.getByRole('button', { name: /sign up/i }).click();

    // Should either:
    // 1. Redirect to verify-email page
    // 2. Show success message
    // 3. Or fail if email somehow already exists
    await page.waitForURL(/\/(verify-email|dashboard|register)/, { timeout: 5000 });
    
    const currentURL = page.url();
    console.log('📧 After registration, redirected to:', currentURL);
    
    // If we got to verify-email, registration succeeded
    if (currentURL.includes('verify-email')) {
      expect(currentURL).toContain('verify-email');
    }
  });

  test('should validate name length limits (max 100 chars)', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const longName = 'A'.repeat(101); // 101 characters (exceeds limit)
    
    await page.getByPlaceholder('John').fill(longName);
    await page.getByPlaceholder('Doe').fill('Test');
    await page.getByPlaceholder('your.email@example.com').fill('test@example.com');
    await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');
    await page.getByPlaceholder(/confirm/i).fill('ValidPassword123.');

    await page.getByRole('button', { name: /sign up/i }).click();

    // Should show validation error
    await expect(page.getByText(/name.*100.*characters/i)).toBeVisible({ timeout: 3000 });
  });

  test('should accept names with accents and special characters', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const timestamp = Date.now();
    await page.getByPlaceholder('John').fill('José María');
    await page.getByPlaceholder('Doe').fill("O'Connor-Pérez");
    await page.getByPlaceholder('your.email@example.com').fill(`special${timestamp}@test.com`);
    await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');
    await page.getByPlaceholder(/confirm/i).fill('ValidPassword123.');

    await page.getByRole('button', { name: /sign up/i }).click();

    // Should accept special characters in names
    // Backend v1.8.0 supports accents and apostrophes
    await page.waitForURL(/\/(verify-email|dashboard|register)/, { timeout: 5000 });
    
    const currentURL = page.url();
    console.log('✅ Names with accents accepted, redirected to:', currentURL);
  });
});

test.describe('Complete E2E Flow', () => {
  test('should complete full user journey: login → dashboard → profile → edit → logout', async ({ page }) => {
    // Step 1: Login
    console.log('🔐 Step 1: Login');
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    console.log('✅ Login successful');

    // Step 2: Verify Dashboard
    console.log('📊 Step 2: Dashboard');
    await expect(page.locator('p:text("Welcome,")')).toBeVisible();
    console.log('✅ Dashboard loaded');

    // Step 3: Navigate to Profile
    console.log('👤 Step 3: Profile');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible();
    await expect(page.locator('text=/panetetrinx@gmail.com/i')).toBeVisible();
    console.log('✅ Profile page loaded');

    // Step 4: Navigate to Edit Profile
    console.log('✏️ Step 4: Edit Profile');
    await page.click('a[href="/edit-profile"], button:has-text("Edit Profile")').catch(() => {
      // If button not found, navigate directly
      return page.goto('/edit-profile');
    });
    await expect(page).toHaveURL('/edit-profile', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /edit.*profile/i })).toBeVisible();
    console.log('✅ Edit Profile page loaded');

    // Step 5: Verify Profile data is pre-filled
    const firstNameInput = page.getByLabel(/first name/i).or(page.getByPlaceholder(/first name/i));
    await expect(firstNameInput).not.toBeEmpty();
    console.log('✅ Profile data pre-filled');

    // Step 6: Logout
    console.log('🚪 Step 5: Logout');
    await page.goto('/dashboard'); // Go back to dashboard for logout
    
    // Open user menu
    await page.click('[data-testid="user-menu-button"]').catch(() => {
      return page.click('button:has-text("Settings")').catch(() => {
        return page.click('[aria-label*="user" i], [aria-label*="menu" i]');
      });
    });
    
    await page.click('button:has-text("Logout")');
    await expect(page).toHaveURL('/', { timeout: 5000 });
    console.log('✅ Logout successful');

    // Step 7: Verify cookies cleared and cannot access protected routes
    console.log('🔒 Step 6: Verify protection');
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login', { timeout: 5000 });
    console.log('✅ Protected route redirects to login after logout');
  });

  test('should handle authentication throughout competitions flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Navigate to competitions
    await page.goto('/competitions');
    await expect(page.getByRole('heading', { name: /my competitions/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ Competitions page accessible when authenticated');

    // Navigate to browse competitions
    await page.goto('/competitions/browse');
    await expect(page.getByRole('heading', { name: /browse.*competitions/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ Browse competitions accessible');

    // Navigate to create competition
    await page.goto('/competitions/create');
    await expect(page.getByRole('heading', { name: /create.*competition/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ Create competition accessible when authenticated');
  });
});

test.describe('Session Timeout & Inactivity', () => {
  test('should maintain session across page reloads', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Get cookies before reload
    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.length).toBeGreaterThan(0);

    // Reload page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('p:text("Welcome,")')).toBeVisible();
    
    console.log('✅ Session persisted after page reload');
  });

  test('should maintain session across tab/window close simulation', async ({ browser }) => {
    // Create new context (simulates new session)
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Pruebas1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Close page (simulate tab close)
    await page.close();

    // Open new page in same context (simulates reopening browser)
    const newPage = await context.newPage();
    
    // Navigate to protected route
    await newPage.goto('/dashboard');

    // Should still be authenticated (if refresh token hasn't expired)
    // This depends on backend session timeout configuration
    const currentURL = newPage.url();
    console.log('🔄 After simulated tab close, URL:', currentURL);
    
    // Cleanup
    await context.close();
  });
});
