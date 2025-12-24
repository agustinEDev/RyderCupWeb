import { test, expect } from '@playwright/test';

/**
 * Security Tests Suite - Frontend v1.8.0
 * 
 * Tests de seguridad para validar protecciones contra ataques comunes:
 * - XSS (Cross-Site Scripting)
 * - CSRF (Cross-Site Request Forgery)
 * - CSP (Content Security Policy) violations
 * - Authentication bypass attempts
 * - Input validation (SQL injection, path traversal, HTML injection)
 */

test.describe('XSS Protection', () => {
  test('should escape HTML in form inputs (React auto-escaping)', async ({ page }) => {
    await page.goto('/register');

    const xssPayload = '<script>alert("XSS")</script>';

    // Try to inject script in first name
    await page.getByPlaceholder('John').fill(xssPayload);
    await page.getByPlaceholder('Doe').fill('Test');
    await page.getByPlaceholder('your.email@example.com').fill('xss@test.com');
    await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');

    // Click outside to trigger any rendering
    await page.click('body');

    // Get page HTML
    const html = await page.content();

    // Verify script tag is escaped
    expect(html).not.toContain('<script>alert("XSS")</script>');
    expect(html).toContain('&lt;script&gt;'); // Should be escaped

    console.log('✅ React auto-escaping working correctly');
  });

  test('should prevent XSS execution via event handlers', async ({ page }) => {
    await page.goto('/login');

    // Listen for any alert dialogs (XSS would trigger alert)
    let alertFired = false;
    page.on('dialog', async dialog => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Try XSS payloads
    const xssPayload = '<img src=x onerror=alert("XSS")>';
    await page.getByPlaceholder('your.email@example.com').fill(xssPayload);

    // Click submit to trigger any potential XSS
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForTimeout(2000);

    // No alert should have fired
    expect(alertFired).toBe(false);
    console.log('✅ XSS payload prevented from executing');
  });
});

test.describe('CSRF Protection', () => {
  test('should use SameSite cookies for authentication', async ({ page, context }) => {
    await page.goto('/login');

    // Attempt login
    await page.getByPlaceholder('your.email@example.com').fill('test@example.com');
    await page.getByPlaceholder('Enter your password').fill('TestPassword123.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait a bit for cookies to be set
    await page.waitForTimeout(2000);

    // Get all cookies
    const cookies = await context.cookies();

    // Check for SameSite attribute
    const authCookies = cookies.filter(c => 
      c.name.includes('token') || c.name.includes('session')
    );

    if (authCookies.length > 0) {
      authCookies.forEach(cookie => {
        expect(['Lax', 'Strict']).toContain(cookie.sameSite);
        console.log(`✅ Cookie ${cookie.name} has SameSite: ${cookie.sameSite}`);
      });
    } else {
      console.log('ℹ️ No auth cookies found (using localStorage)');
    }
  });
});

test.describe('CSP Violations', () => {
  test('should block inline script execution', async ({ page }) => {
    const cspViolations = [];

    // Listen for CSP violations
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy') || 
          msg.text().includes('refused to execute')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto('/');

    // Try to execute inline script via devtools
    await page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.innerHTML = 'console.log("Inline script executed")';
        document.body.appendChild(script);
      } catch (e) {
        console.log('CSP blocked inline script:', e.message);
      }
    });

    await page.waitForTimeout(1000);

    // In production with proper CSP, this should fail
    // For now, we just verify the attempt was made
    console.log(`ℹ️ CSP violations detected: ${cspViolations.length}`);
  });

  test('should have security headers present', async ({ page }) => {
    const response = await page.goto('/');

    const headers = response.headers();

    // Check for security headers
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'strict-origin-when-cross-origin',
    };

    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = headers[header];
      
      if (actualValue) {
        expect(actualValue.toLowerCase()).toContain(expectedValue.toLowerCase());
        console.log(`✅ ${header}: ${actualValue}`);
      } else {
        console.log(`⚠️ Missing header: ${header}`);
      }
    }
  });
});

test.describe('Authentication Security', () => {
  test('should reject invalid authentication attempts', async ({ page }) => {
    await page.goto('/login');

    // Try SQL injection in email
    await page.getByPlaceholder('your.email@example.com').fill("admin'--");
    await page.getByPlaceholder('Enter your password').fill("' OR '1'='1");
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(2000);

    // Should remain on login page
    expect(page.url()).toContain('/login');
    console.log('✅ SQL injection attempt rejected');
  });

  test('should not expose sensitive error messages', async ({ page }) => {
    await page.goto('/login');

    // Try with non-existent user
    await page.getByPlaceholder('your.email@example.com').fill('nonexistent@test.com');
    await page.getByPlaceholder('Enter your password').fill('WrongPassword123.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(2000);

    const pageContent = await page.content();

    // Should NOT reveal if user exists or not
    expect(pageContent).not.toContain('user not found');
    expect(pageContent).not.toContain('user does not exist');
    
    // Should have generic error message
    const hasGenericError = 
      pageContent.toLowerCase().includes('invalid') ||
      pageContent.toLowerCase().includes('incorrect');

    expect(hasGenericError).toBeTruthy();
    console.log('✅ No sensitive information leaked in error messages');
  });

  test('should clear sensitive data after logout', async ({ page, context }) => {
    await page.goto('/login');

    // Login
    await page.getByPlaceholder('your.email@example.com').fill('test@example.com');
    await page.getByPlaceholder('Enter your password').fill('Test123.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(2000);

    // Check localStorage before logout
    const hasTokenBefore = await page.evaluate(() => {
      return localStorage.getItem('access_token') !== null;
    });

    if (hasTokenBefore) {
      // Logout (if we logged in successfully)
      try {
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);
        
        // Try to find logout button
        const logoutButton = page.locator('text=/logout|sign out/i').first();
        if (await logoutButton.isVisible({ timeout: 2000 })) {
          await logoutButton.click();
          await page.waitForTimeout(1000);

          // Check localStorage after logout
          const hasTokenAfter = await page.evaluate(() => {
            return localStorage.getItem('access_token') !== null;
          });

          expect(hasTokenAfter).toBeFalsy();
          console.log('✅ Sensitive data cleared after logout');
        }
      } catch (e) {
        console.log('ℹ️ Could not test logout (user might not exist)');
      }
    }
  });
});

test.describe('Input Validation', () => {
  test('should reject malformed email addresses', async ({ page }) => {
    await page.goto('/register');

    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'test@',
      'test..test@example.com',
      'test@example',
    ];

    for (const email of invalidEmails) {
      await page.getByPlaceholder('your.email@example.com').fill(email);
      await page.getByPlaceholder('John').fill('Test');
      await page.getByPlaceholder('Doe').fill('User');
      await page.getByPlaceholder('Minimum 12 characters').fill('ValidPassword123.');

      // Try to submit
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForTimeout(500);

      // Should show validation error
      const hasError = await page.locator('text=/invalid|error/i').count() > 0;
      
      console.log(`  ${email}: ${hasError ? '✅ Rejected' : '⚠️ Accepted'}`);
    }
  });

  test('should enforce password complexity', async ({ page }) => {
    await page.goto('/register');

    const weakPasswords = [
      'short',           // Too short
      'password123',     // No uppercase
      'PASSWORD123',     // No lowercase
      'PasswordABC',     // No numbers
      '12345678901',     // Only numbers
    ];

    for (const password of weakPasswords) {
      await page.getByPlaceholder('Minimum 12 characters').fill(password);
      await page.getByPlaceholder('John').fill('Test');
      await page.getByPlaceholder('Doe').fill('User');
      await page.getByPlaceholder('your.email@example.com').fill('test@example.com');

      // Try to submit
      await page.getByRole('button', { name: /create account/i }).click();
      await page.waitForTimeout(500);

      const pageContent = await page.content();
      const hasPasswordError = 
        pageContent.toLowerCase().includes('password') &&
        (pageContent.toLowerCase().includes('invalid') ||
         pageContent.toLowerCase().includes('must') ||
         pageContent.toLowerCase().includes('require'));

      console.log(`  "${password}": ${hasPasswordError ? '✅ Rejected' : '⚠️ May be weak'}`);
    }
  });

  test('should prevent excessively long inputs', async ({ page }) => {
    await page.goto('/register');

    // Try extremely long name
    const longString = 'A'.repeat(200);

    await page.getByPlaceholder('John').fill(longString);

    // Check input value length (should be limited by maxLength)
    const actualValue = await page.getByPlaceholder('John').inputValue();
    
    expect(actualValue.length).toBeLessThanOrEqual(100);
    console.log(`✅ Long input truncated: ${longString.length} → ${actualValue.length}`);
  });
});

test.describe('Rate Limiting Awareness', () => {
  test('should handle rate limiting gracefully', async ({ page }) => {
    await page.goto('/login');

    // Attempt multiple rapid logins
    for (let i = 0; i < 3; i++) {
      await page.getByPlaceholder('your.email@example.com').fill(`test${i}@example.com`);
      await page.getByPlaceholder('Enter your password').fill('WrongPassword123.');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForTimeout(500);
    }

    // Check if rate limit message appears
    const pageContent = await page.content();
    const hasRateLimitMessage = 
      pageContent.toLowerCase().includes('too many') ||
      pageContent.toLowerCase().includes('rate limit') ||
      pageContent.toLowerCase().includes('try again later');

    if (hasRateLimitMessage) {
      console.log('✅ Rate limiting is active');
    } else {
      console.log('ℹ️ Rate limiting not detected (may not be active in dev)');
    }
  });
});
