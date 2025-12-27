import { test } from '@playwright/test';

// Check for required environment variables before defining tests
const testEmail = process.env.TEST_EMAIL;
const testPassword = process.env.TEST_PASSWORD;
const missingEnvVars = !testEmail || !testPassword;

test.describe('Debug Login', () => {
  // Conditionally skip if env vars are missing
  const maybeTest = missingEnvVars ? test.skip : test;

  maybeTest('should show login form and attempt login with debug', async ({ page }) => {
    // Listen to all network requests
    const responses = [];
    page.on('response', async response => {
      const url = response.url();
      const status = response.status();
      const ok = response.ok();

      responses.push({ url, status, ok });

      // If it's the login request, capture the response body
      if (url.includes('/auth/login')) {
        try {
          const body = await response.json();
          console.log('🔐 Login response:', JSON.stringify(body, null, 2));
        } catch (e) {
          try {
            console.log('🔐 Login response (text):', await response.text());
          } catch (e2) {
            console.log('🔐 Could not read response body');
          }
        }
      }
    });

    // Also listen to requests (avoid logging sensitive data)
    page.on('request', async request => {
      if (request.url().includes('/auth/login')) {
        console.log('📤 Login request sent to:', request.url());
      }
    });

    // Navigate to login
    await page.goto('/login');

    // Wait a bit for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'debug-login-initial.png', fullPage: true });

    // Check what we have on the page
    const heading = await page.locator('h1, h2, h3').allTextContents();
    console.log('📋 Headings found:', heading);

    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    const emailCount = await emailInput.count();
    console.log('📧 Email inputs found:', emailCount);

    if (emailCount > 0) {
      console.log('📧 Email placeholder:', await emailInput.getAttribute('placeholder'));
    }

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    const passwordCount = await passwordInput.count();
    console.log('🔒 Password inputs found:', passwordCount);

    if (passwordCount > 0) {
      console.log('🔒 Password placeholder:', await passwordInput.getAttribute('placeholder'));
    }

    // Try to fill the form
    console.log('🔍 Attempting to fill email...');
    await emailInput.fill(testEmail);
    console.log('✅ Email filled');

    console.log('🔍 Attempting to fill password...');
    await passwordInput.fill(testPassword);
    console.log('✅ Password filled');
    
    // Take screenshot after filling
    await page.screenshot({ path: 'debug-login-filled.png', fullPage: true });
    
    // Find and click button
    const buttons = await page.locator('button').allTextContents();
    console.log('🔘 Buttons found:', buttons);
    
    const submitButton = page.locator('button[type="submit"]').or(page.getByRole('button', { name: /sign in/i }));
    console.log('🔍 Attempting to click submit...');
    await submitButton.click();
    console.log('✅ Submit clicked');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(3000);
    
    // Log all responses
    console.log('🌐 All network responses:');
    responses.forEach(r => {
      if (r.url.includes('localhost:8000') || r.url.includes('api')) {
        console.log(`   ${r.status} ${r.ok ? '✅' : '❌'} ${r.url}`);
      }
    });
    
    // Check current URL
    const currentURL = page.url();
    console.log('📍 Current URL after login:', currentURL);
    
    // Take screenshot after submit
    await page.screenshot({ path: 'debug-login-after-submit.png', fullPage: true });
    
    // Check for any error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-red-600').allTextContents();
    console.log('❌ Error messages:', errorMessages);
    
    // Check console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // Check network errors
    page.on('requestfailed', request => {
      console.log('🌐 Failed Request:', request.url(), request.failure()?.errorText);
    });
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    console.log('📍 Final URL:', page.url());
  });
});
