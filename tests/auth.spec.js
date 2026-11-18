import { test, expect } from '@playwright/test';

test.describe('Authentication & Landing Page', () => {
  test(
    'should load the landing page and have the correct title',
    { tag: '@smoke' },
    async ({ page }) => {
      // Navigate to the home page
      await page.goto('/');

      // Assert that the page title contains "RyderCupFriends"
      await expect(page).toHaveTitle(/RyderCupFriends/);
    },
  );
});
