import { test, expect, metric } from './fixtures';
import { CALIBRATION, GOLDEN, reference } from '../../src/eval/data';
import { THRESHOLDS } from '../../src/eval/config';
import { judge, type Verdict } from '../../src/eval/judge';

/**
 * Layer 3, LLM judge, from a different model family to the bot.
 * Replaces the manual check "read each answer against the source policy and
 * decide whether it is correct and supported".
 *
 * Serial on purpose: if the judge fails calibration, its verdicts on the bot
 * are not trustworthy, so the second test does not run.
 */

test.describe.configure({ mode: 'serial' });

test.describe('judge', () => {
  test('the judge agrees with the hand labels before it marks the bot', async () => {
    test.setTimeout(20 * 60_000);
    const misses: string[] = [];
    for (const item of CALIBRATION) {
      const v: Verdict = await judge(reference(item.source), item.question, item.answer);
      const agrees = (v === 'YES') === item.grounded && v !== 'UNPARSEABLE';
      if (!agrees) misses.push(`${item.id}: label ${item.grounded ? 'YES' : 'NO'}, judge ${v}`);
    }
    const agreement = 1 - misses.length / CALIBRATION.length;
    metric('judge calibration', `agreement ${agreement.toFixed(2)}; misses: ${misses.join('; ') || 'none'}`);
    expect(agreement, `judge disagreed with hand labels: ${misses.join('; ')}`).toBeGreaterThanOrEqual(THRESHOLDS.judgeCalibration);
  });

  test('the judge rates the bot\'s golden answers as grounded', async ({ chat }) => {
    test.setTimeout(20 * 60_000);
    const failures: string[] = [];
    for (const item of GOLDEN) {
      const { reply } = await chat(item.question);
      const v = await judge(reference(item.source), item.question, reply);
      if (v !== 'YES') failures.push(`${item.id} (${v}): ${reply}`);
    }
    const rate = 1 - failures.length / GOLDEN.length;
    metric('judge grounded', `rate ${rate.toFixed(2)}; not grounded: ${failures.map((f) => f.split(' ')[0]).join(', ') || 'none'}`);
    expect(rate, `answers the judge did not rate grounded:\n${failures.join('\n')}`).toBeGreaterThanOrEqual(THRESHOLDS.judgeGrounded);
  });
});
