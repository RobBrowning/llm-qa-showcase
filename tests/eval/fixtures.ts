import { test as base, expect } from '@playwright/test';
import type { Reply } from '../../src/app/bot';
import { CANARY } from '../../src/app/config';

/**
 * Eval fixtures. `chat` sends one message to the running chatbot over HTTP,
 * exactly as the web page does, and attaches the exchange to the report so
 * every verdict can be checked against the real reply.
 */

type Chat = (message: string) => Promise<Reply>;

export const test = base.extend<{ chat: Chat }>({
  chat: async ({ request }, use, testInfo) => {
    await use(async (message) => {
      const res = await request.post('/api/chat', { data: { message } });
      expect(res.status(), `chat API status for "${message}"`).toBe(200);
      const reply = (await res.json()) as Reply;
      testInfo.annotations.push({ type: 'exchange', description: `Q: ${message}\nA: ${reply.reply}` });
      return reply;
    });
  },
});

/**
 * Records a headline number on the test and, in CI, prints it as a GitHub
 * notice so it shows on the run's summary page without opening the report.
 */
export function metric(name: string, value: string): void {
  base.info().annotations.push({ type: 'metric', description: `${name}: ${value}` });
  if (process.env.CI) console.log(`::notice title=${name}::${value}`);
}

export { expect, CANARY };
