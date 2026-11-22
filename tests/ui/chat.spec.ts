import { test, expect } from '@playwright/test';
import { REFUSAL_SCOPE } from '../../src/app/config';

/**
 * Layer 5, UI: the chat page, against the app in stub mode (no models), so
 * these tests check the page and never depend on what a model says.
 * Replaces the manual check "open the help page, ask a question, and confirm
 * the conversation, loading state and error handling behave".
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('send is disabled until a question is typed @smoke', async ({ page }) => {
  const send = page.getByTestId('send-button');
  await expect(send).toBeDisabled();
  await page.getByTestId('message-input').fill('   ');
  await expect(send).toBeDisabled();
  await page.getByTestId('message-input').fill('What is the deposit?');
  await expect(send).toBeEnabled();
});

test('a question gets a reply with its sources @smoke', async ({ page }) => {
  await page.getByTestId('message-input').fill('What is the deposit?');
  await page.getByTestId('send-button').click();

  await expect(page.getByTestId('user-message')).toHaveText('What is the deposit?');
  const bot = page.getByTestId('bot-message');
  await expect(bot).toHaveCount(1);
  await expect(bot.getByTestId('sources')).toHaveText('Sources: bookings-and-refunds#deposit');
  await expect(page.getByTestId('message-input')).toBeEmpty();
  await expect(page.getByTestId('message-input')).toBeFocused();
});

test('an off-topic question shows the refusal with no sources', async ({ page }) => {
  await page.getByTestId('message-input').fill('Who won the World Cup in 2018?');
  await page.getByRole('button', { name: 'Send' }).click();

  const bot = page.getByTestId('bot-message');
  await expect(bot).toHaveText(REFUSAL_SCOPE);
  await expect(bot.getByTestId('sources')).toHaveCount(0);
});

test('the conversation keeps every turn in order', async ({ page }) => {
  for (const q of ['What is the deposit?', 'What time do you open on Sunday?']) {
    await page.getByTestId('message-input').fill(q);
    await page.getByTestId('send-button').click();
    await expect(page.getByTestId('message-input')).toBeEnabled();
  }
  const turns = page.getByTestId('transcript').getByRole('listitem');
  await expect(turns).toHaveCount(4);
  await expect(turns.nth(0)).toHaveText('What is the deposit?');
  await expect(turns.nth(2)).toHaveText('What time do you open on Sunday?');
});

test('shows a loading state while waiting and blocks a second send', async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/api/chat', async (route) => {
    await held;
    await route.continue();
  });

  await page.getByTestId('message-input').fill('What is the deposit?');
  await page.getByTestId('send-button').click();
  await expect(page.getByTestId('status')).toHaveText('Thinking...');
  await expect(page.getByTestId('message-input')).toBeDisabled();
  await expect(page.getByTestId('send-button')).toBeDisabled();

  release();
  await expect(page.getByTestId('bot-message')).toHaveCount(1);
  await expect(page.getByTestId('status')).toHaveText('');
});

test('a server error shows a friendly message, not a raw error', async ({ page }) => {
  await page.route('**/api/chat', (route) => route.fulfill({ status: 500, body: '{"error":"internal error"}' }));

  await page.getByTestId('message-input').fill('What is the deposit?');
  await page.getByTestId('send-button').click();

  await expect(page.getByTestId('error-message')).toHaveText('Sorry, something went wrong. Please try again.');
  await expect(page.getByTestId('bot-message')).toHaveCount(0);
  await expect(page.getByTestId('message-input')).toBeEnabled();
});
