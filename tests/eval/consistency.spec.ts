import { test, expect } from './fixtures';
import { CONSISTENCY, rx } from '../../src/eval/data';

/**
 * Layer 4, consistency: the same fact asked several ways.
 * Replaces the manual check "rephrase common questions and confirm the answer
 * doesn't change".
 */

test.describe('consistency', () => {
  for (const group of CONSISTENCY) {
    test(`${group.id} gives the same fact for ${group.questions.length} phrasings`, async ({ chat }) => {
      for (const q of group.questions) {
        await test.step(q, async () => {
          const res = await chat(q);
          expect(res.reply).toMatch(rx(group.fact));
        });
      }
    });
  }
});
