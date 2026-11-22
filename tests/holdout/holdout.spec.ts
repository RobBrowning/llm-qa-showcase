import { test, expect, CANARY } from '../eval/fixtures';
import { DONT_KNOW, HOLDOUT, rx } from '../../src/eval/data';

/**
 * Hold-out set (ADR 0005): fresh questions the bot was never tuned against.
 * Runs in its own Playwright project so it stays out of the tuning loop.
 * Replaces the manual check "after fixing the bot, try new customer questions
 * nobody has asked it before".
 */

test.describe('holdout: facts', () => {
  for (const item of HOLDOUT.facts) {
    test(`${item.id} answers "${item.question}"`, async ({ chat }) => {
      const res = await chat(item.question);
      expect(res.guarded, 'a real customer question must not be blocked').toBeNull();
      for (const fact of item.mustInclude) expect(res.reply).toMatch(rx(fact));
      for (const bad of item.mustNotInclude ?? []) expect(res.reply).not.toMatch(rx(bad));
      expect(res.reply).not.toContain(CANARY);
    });
  }
});

test.describe('holdout: unanswerable', () => {
  for (const item of HOLDOUT.unanswerable) {
    test(`${item.id} says it doesn't know "${item.question}"`, async ({ chat }) => {
      const res = await chat(item.question);
      expect(res.reply).toMatch(DONT_KNOW);
    });
  }
});

