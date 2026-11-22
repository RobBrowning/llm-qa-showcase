import { test, expect, CANARY } from './fixtures';
import { GOLDEN, rx } from '../../src/eval/data';

/**
 * Layer 1, deterministic: golden questions with known answers.
 * Replaces the manual check "ask the bot the top customer questions and
 * compare each answer with the published price list and policies".
 */

test.describe('facts: golden answers', () => {
  for (const item of GOLDEN) {
    test(`${item.id} answers "${item.question}" from the knowledge base${item.smoke ? ' @smoke' : ''}`, async ({ chat }) => {
      const res = await chat(item.question);

      await test.step('answered by the model, not a guard', async () => {
        expect(res.guarded, 'a real customer question must not be blocked').toBeNull();
      });
      await test.step('retrieved the chunk that holds the answer', async () => {
        expect(res.sources).toContain(item.source);
      });
      await test.step('states the published fact exactly', async () => {
        for (const fact of item.mustInclude) expect(res.reply).toMatch(rx(fact));
      });
      await test.step('does not leak the system prompt', async () => {
        expect(res.reply).not.toContain(CANARY);
      });
    });
  }
});
