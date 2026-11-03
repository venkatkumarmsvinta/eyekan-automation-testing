import { test, expect } from '@playwright/test';
import { SignInPage } from '../pages/sign-in.page';

const email = process.env.TEST_USER_EMAIL ?? '';
const password = process.env.TEST_USER_PASSWORD ?? '';

// Match on the path only, so /sign-in?next=/app doesn't count as being on /app.
const onPath = (re: RegExp) => (url: URL) => re.test(url.pathname);

test.describe('Sign in page', () => {
  let signIn: SignInPage;

  test.beforeEach(async ({ page }) => {
    signIn = new SignInPage(page);
    await signIn.goto();
  });

  test.describe('layout', () => {
    test('shows the form', async ({ page }) => {
      await expect(page).toHaveTitle(/Sign in/);
      await expect(signIn.heading).toBeVisible();
      await expect(signIn.email).toBeVisible();
      await expect(signIn.email).toHaveAttribute('type', 'email');
      await expect(signIn.password).toHaveAttribute('type', 'password');
      await expect(signIn.submit).toBeEnabled();
    });

    test('SSO button is disabled', async () => {
      await expect(signIn.sso).toBeDisabled();
    });

    test('links go to the right pages', async () => {
      await expect(signIn.forgotPassword).toHaveAttribute('href', '/forgot-password');
      await expect(signIn.requestAccess).toHaveAttribute('href', '/sign-up');
      await expect(signIn.bookDemo).toHaveAttribute('href', '/contact');
    });

    test('forgot password link navigates', async ({ page }) => {
      await signIn.forgotPassword.click();
      await expect(page).toHaveURL(onPath(/^\/forgot-password$/));
    });

    test('request access link navigates', async ({ page }) => {
      await signIn.requestAccess.click();
      await expect(page).toHaveURL(onPath(/^\/sign-up$/));
    });
  });

  test.describe('validation', () => {
    test('empty form shows both field errors', async ({ page }) => {
      await signIn.submit.click();
      await expect(signIn.fieldError(signIn.email)).toHaveText('Enter a full email address, like priya@northline.com.');
      await expect(signIn.fieldError(signIn.password)).toHaveText('Enter your password.');
      await expect(signIn.email).toHaveAttribute('aria-invalid', 'true');
      await expect(page).toHaveURL(/\/sign-in/);
    });

    const invalidEmails = [
      'not-an-email',
      'admin@',
      '@dts.test',
      'admin@@dts.test',
      'ad min@dts.test',
      'admin@dts',
    ];

    for (const bad of invalidEmails) {
      test(`invalid email "${bad}" is rejected`, async ({ page }) => {
        await signIn.signIn(bad, 'whatever');
        await expect(signIn.fieldError(signIn.email)).toHaveText('Enter a full email address, like priya@northline.com.');
        await expect(signIn.email).toHaveAttribute('aria-invalid', 'true');
        await expect(signIn.fieldError(signIn.password)).toHaveCount(0);
        await expect(page).toHaveURL(/\/sign-in/);
      });
    }

    test('valid email passes email validation', async () => {
      await signIn.signIn('admin@dts.test', '');
      await expect(signIn.fieldError(signIn.email)).toHaveCount(0);
      await expect(signIn.email).not.toHaveAttribute('aria-invalid', 'true');
    });

    test('missing password is rejected', async () => {
      await signIn.signIn('someone@northline.com', '');
      await expect(signIn.fieldError(signIn.password)).toHaveText('Enter your password.');
      await expect(signIn.fieldError(signIn.email)).toHaveCount(0);
    });
  });

  test.describe('authentication', () => {
    test('wrong password shows an error', async ({ page }) => {
      await signIn.signIn(email || 'admin@dts.test', 'definitely-wrong-password');
      await expect(signIn.errorNotice).toContainText('That email and password don’t match');
      await expect(page).toHaveURL(/\/sign-in/);
    });

    test('unknown email shows the same error', async () => {
      await signIn.signIn(`nobody-${Date.now()}@northline.com`, 'some-password-123');
      await expect(signIn.errorNotice).toContainText('That email and password don’t match');
    });

    test.describe('with a valid account', () => {
      test.skip(!email || !password, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD');

      test('signs in and lands on /app', async ({ page }) => {
        await signIn.signIn(email, password);
        await expect(page).toHaveURL(onPath(/^\/app(\/|$)/));
      });

      test('honours the next parameter', async ({ page }) => {
        await signIn.goto('?next=/app/reports');
        await signIn.signIn(email, password);
        await expect(page).toHaveURL(onPath(/^\/app\/reports$/));
      });

      test('ignores an off-site next parameter', async ({ page }) => {
        await signIn.goto('?next=//evil.example.com');
        await signIn.signIn(email, password);
        await expect(page).toHaveURL(onPath(/^\/app$/));
      });

      test('signed-in user visiting /sign-in is sent away from it', async ({ page }) => {
        await signIn.signIn(email, password);
        await expect(page).toHaveURL(onPath(/^\/app/));
        await signIn.goto();
        // Proxy sends them to /app; staff accounts then go on to /staff-dashboard.
        await expect(page).toHaveURL(onPath(/^\/(app|staff-dashboard)$/));
      });
    });
  });

  test.describe('redirects and notices', () => {
    test('protected route redirects here with next', async ({ page }) => {
      await page.goto('/app');
      await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp$/);
      await expect(signIn.heading).toBeVisible();
    });

    test('confirmed notice', async () => {
      await signIn.goto('?notice=confirmed');
      await expect(signIn.statusNotice).toHaveText('Your email is confirmed. Sign in to continue.');
    });

    test('link-expired notice', async () => {
      await signIn.goto('?notice=link-expired');
      await expect(signIn.statusNotice).toContainText('That link has expired or was already used.');
    });

    test('unknown notice shows nothing', async () => {
      await signIn.goto('?notice=bogus');
      await expect(signIn.statusNotice).toHaveCount(0);
    });
  });
});
