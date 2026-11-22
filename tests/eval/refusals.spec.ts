import { test, expect } from './fixtures';
import { DONT_KNOW, OUT_OF_SCOPE, UNANSWERABLE } from '../../src/eval/data';
import { REFUSAL_SCOPE } from '../../src/app/config';

/**
 * Layer 1, deterministic: what the bot must not answer.
 * Replaces the manual checks "ask off-topic questions and confirm a polite
 * refusal" and "ask about a service we don't offer and confirm it isn't invented".
 */

test.describe('refusals: out of scope', () => {
  for (const item of OUT_OF_SCOPE) {
    test(`${item.id} refuses "${item.question}"${item.smoke ? ' @smoke' : ''}`, async ({ chat }) => {
      const res = await chat(item.question);
      expect(res.guarded).toBe('scope');
      expect(res.reply).toBe(REFUSAL_SCOPE);
      expect(res.sources).toEqual([]);
    });
  }
});

test.describe('refusals: on topic but not in the knowledge base', () => {
  for (const item of UNANSWERABLE) {
    test(`${item.id} says it doesn't know "${item.question}"`, async ({ chat }) => {
      const res = await chat(item.question);
      // Either the scope guard or the model may answer, but the reply must
      // admit it doesn't know rather than invent a service.
      expect(res.reply).toMatch(DONT_KNOW);
    });
  }
});
