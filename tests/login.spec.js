import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  

  test('should allow a user to log in successfully', async ({ page }) => {
    // 1. Arrange: Navigate to the login page
    await page.goto('/login');

    // Add an explicit wait for a stable element like the header
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // 2. Act: Fill the form and submit
    await page.getByPlaceholder('your.email@example.com').fill('panetetrinx@gmail.com');
    await page.getByPlaceholder('Enter your password').fill('Prueba1234.');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 3. Assert: Verify the user is redirected to the dashboard
    // We wait for the URL to change to '/dashboard'
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Assert: Verify the welcome message is visible
    await expect(page.locator('p:text("Welcome,")')).toBeVisible();
  });

  test('should display an error message for incorrect credentials', async ({ page }) => {
    // 1. Arrange: Navigate to the login page
    await page.goto('/login');

    // Add an explicit wait for a stable element like the header
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    // 2. Act: Fill the form with incorrect credentials and submit
    await page.getByPlaceholder('your.email@example.com').fill('wrong@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 3. Assert: Verify an error message is displayed and no redirection occurs
    await expect(page.getByText('Incorrect email or password')).toBeVisible();
    await expect(page).toHaveURL('/login'); // Should remain on the login page
  });

});
