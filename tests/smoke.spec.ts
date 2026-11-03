import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test('home page loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
  });
});
