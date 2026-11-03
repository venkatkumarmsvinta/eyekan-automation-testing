import type { Locator, Page } from '@playwright/test';

export class SignInPage {
  readonly heading: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly sso: Locator;
  readonly forgotPassword: Locator;
  readonly requestAccess: Locator;
  readonly bookDemo: Locator;
  readonly errorNotice: Locator;
  readonly statusNotice: Locator;

  constructor(readonly page: Page) {
    const form = page.locator('form');
    this.heading = page.getByRole('heading', { name: 'Sign in' });
    this.email = page.getByLabel('Work email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: /^Sign(ing)? in/ });
    this.sso = page.getByRole('button', { name: 'Continue with SSO' });
    this.forgotPassword = form.getByRole('link', { name: 'Forgot password' });
    this.requestAccess = form.getByRole('link', { name: 'Request access' });
    this.bookDemo = form.getByRole('link', { name: 'book a demo' });
    this.errorNotice = page.getByRole('alert').filter({ hasText: 'Couldn’t sign you in' });
    this.statusNotice = form.getByRole('status');
  }

  async goto(query = '') {
    await this.page.goto(`/sign-in${query}`);
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  fieldError(field: Locator) {
    // TextField links its error text to the input through aria-describedby.
    return field.locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " ac-field ")][1]').locator('.ac-field__hint');
  }
}
