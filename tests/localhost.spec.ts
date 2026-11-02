import { test, expect } from '@playwright/test';

test('app on localhost loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
});
