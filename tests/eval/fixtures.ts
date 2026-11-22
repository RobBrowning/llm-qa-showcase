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

export { expect, CANARY };
