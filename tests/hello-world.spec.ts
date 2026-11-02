import { test, expect } from '@playwright/test';

test('hello world', async ({ page }) => {
  await page.setContent('<h1>Hello, World!</h1>');
  await expect(page.getByRole('heading', { name: 'Hello, World!' })).toBeVisible();
});

test('playwright.dev has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
