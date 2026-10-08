import { expect, test } from '@playwright/test';
import { PRODUCTS } from '../fixtures/site';

test('each service starts the enquiry with the chosen situation', async ({ page }) => {
  for (const [label, need] of [
    ['Talk through a decision', 'consult'],
    ['Discuss a redesign', 'redesign'],
    ['Work out where AI fits', 'ai'],
    ['Discuss something to build', 'build'],
    ['start here', 'unsure'],
  ]) {
    await page.goto('/services/');
    await page.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`need=${need}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('What should I know?');
    await expect(page.locator('#progress')).toHaveText('Step 2 of 3');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.locator(`input[value="${need}"]`)).toBeChecked();
  }
});

test('the stepper keeps answers and edited enquiries when moving backward', async ({ page }) => {
  await page.goto('/work-together/');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByLabel('Software that needs a rethink').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByLabel('Your situation').fill('Our app is hard to navigate.');
  await page.getByLabel('This is for a nonprofit').check();
  await page.getByRole('button', { name: 'See a starting point' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Start with a product review.');
  await page.getByRole('button', { name: 'Prepare an enquiry' }).click();
  await expect(page.getByLabel('Your enquiry')).toHaveValue(/Our app is hard to navigate/);
  await expect(page.getByLabel('Your enquiry')).toHaveValue(/reduced rates/);
  const edited = 'Please help us simplify navigation.\nWe are a nonprofit.';
  await page.getByLabel('Your enquiry').fill(edited);
  const href = await page.getByRole('link', { name: 'Email enquiry' }).getAttribute('href');
  expect(href?.split('?')[0]).toBe('mailto:hello@hypertext.studio');
  expect(new URLSearchParams(href!.split('?')[1]).get('body')).toBe(edited);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare an enquiry' }).click();
  await expect(page.getByLabel('Your enquiry')).toHaveValue(edited);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('Your situation')).toHaveValue('Our app is hard to navigate.');
  await expect(page.getByLabel('This is for a nonprofit')).toBeChecked();
  await page.getByLabel('Your situation').fill('We need to simplify our checkout.');
  await page.getByRole('button', { name: 'See a starting point' }).click();
  await page.getByRole('button', { name: 'Prepare an enquiry' }).click();
  await expect(page.getByLabel('Your enquiry')).toHaveValue(/simplify our checkout/);
});

test('context is optional and reduced-rate links select the nonprofit option', async ({ page }) => {
  await page.goto('/services/');
  await page.getByRole('link', { name: 'ask about reduced rates' }).click();
  await page.getByLabel('I’m still working it out').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByLabel('This is for a nonprofit')).toBeChecked();
  await page.getByRole('button', { name: 'See a starting point' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Start by defining the problem.',
  );
});

test('product choice skips the enquiry and links directly to the products', async ({ page }) => {
  await page.goto('/work-together/?need=product');
  await expect(page.locator('#progress')).toHaveText('Step 2 of 2');
  await expect(page.getByRole('button', { name: 'Prepare an enquiry' })).not.toBeVisible();
  for (const product of PRODUCTS) {
    await expect(
      page.locator('#result-items').getByRole('link', { name: new RegExp(product.name) }),
    ).toHaveAttribute('href', product.url);
  }
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByLabel('An existing product I can use')).toBeChecked();
});

test('invalid service parameters leave visitors at the first step', async ({ page }) => {
  await page.goto('/work-together/?need=toString');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What do you need help with?');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
});

test('visitors without JavaScript can still email Willie', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/work-together/');
  await expect(page.getByRole('link', { name: 'Email Willie' })).toHaveAttribute(
    'href',
    'mailto:hello@hypertext.studio',
  );
  await expect(page.getByRole('button', { name: 'Continue' })).not.toBeVisible();
  await context.close();
});
