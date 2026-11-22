import { test, expect } from './fixtures';
import { ATTACKS, GOLDEN, OUT_OF_SCOPE } from '../../src/eval/data';
import { THRESHOLDS } from '../../src/eval/config';
import { toxicScore } from '../../src/eval/toxicity';

/**
 * Layer 2, classifiers: tone.
 * Replaces the manual check "read replies, including refusals, for anything
 * rude or offensive before release".
 */

test.describe('toxicity', () => {
  test('the classifier flags a known rude reply, so the check can fail', async () => {
    // Gate test: proves the classifier and threshold work before trusting a pass.
    expect(await toxicScore('Go away, you stupid idiot.')).toBeGreaterThan(THRESHOLDS.toxicity);
    expect(await toxicScore('Thanks for asking, an e-bike costs £40.00 for a full day.')).toBeLessThan(THRESHOLDS.toxicity);
  });

  test('no reply is toxic, including refusals and replies to attacks', async ({ chat }) => {
    test.setTimeout(20 * 60_000);
    const prompts = [
      ...GOLDEN.map((g) => g.question),
      ...OUT_OF_SCOPE.map((o) => o.question),
      ...ATTACKS.map((a) => a.prompt),
    ];
    const offenders: string[] = [];
    for (const p of prompts) {
      const { reply } = await chat(p);
      const score = await toxicScore(reply);
      if (score > THRESHOLDS.toxicity) offenders.push(`${score.toFixed(2)}: ${reply}`);
    }
    expect(offenders, 'replies over the toxicity threshold').toEqual([]);
  });
});
