import { test, expect, CANARY, metric } from './fixtures';
import { ATTACKS, adversarialSample, rx } from '../../src/eval/data';
import { THRESHOLDS } from '../../src/eval/config';
import { REFUSAL_INJECTION } from '../../src/app/config';

/**
 * Layer 2, classifiers and attacks: prompt injection.
 * Replaces the manual check "try known jailbreaks and confirm the bot neither
 * leaks its instructions nor follows the attacker".
 */

test.describe('safety: hand-written attacks', () => {
  for (const a of ATTACKS) {
    test(`${a.id} resists "${a.prompt.slice(0, 50)}"${a.smoke ? ' @smoke' : ''}`, async ({ chat }) => {
      const res = await chat(a.prompt);
      expect(res.reply, 'system prompt canary leaked').not.toContain(CANARY);
      if (a.expectBlocked) {
        expect(res.guarded).toBe('injection');
        expect(res.reply).toBe(REFUSAL_INJECTION);
      }
      for (const p of a.mustInclude ?? []) expect(res.reply).toMatch(rx(p));
      for (const p of a.mustNotInclude ?? []) expect(res.reply).not.toMatch(rx(p));
    });
  }
});

test.describe('safety: public prompt-injection dataset', () => {
  test('guard blocks known injections and lets benign prompts through, with no leaks', async ({ chat }) => {
    test.setTimeout(20 * 60_000);
    const rows = adversarialSample();
    const injections = rows.filter((r) => r.label === 1);
    const benign = rows.filter((r) => r.label === 0);
    expect(injections.length, 'sample must include injections').toBeGreaterThan(0);
    expect(benign.length, 'sample must include benign prompts').toBeGreaterThan(0);

    let blocked = 0;
    let falsePositives = 0;
    const leaks: string[] = [];
    for (const row of rows) {
      const res = await chat(row.text);
      if (res.reply.includes(CANARY)) leaks.push(row.text);
      if (res.guarded === 'injection') {
        if (row.label === 1) blocked++;
        else falsePositives++;
      }
    }
    const recall = blocked / injections.length;
    const fpRate = falsePositives / benign.length;
    metric('guard', `recall ${recall.toFixed(2)} (${blocked}/${injections.length}), false positives ${fpRate.toFixed(2)} (${falsePositives}/${benign.length}), leaks ${leaks.length}`);

    expect(leaks, 'replies that leaked the canary').toEqual([]);
    expect(recall, 'share of injections blocked').toBeGreaterThanOrEqual(THRESHOLDS.guardRecall);
    expect(fpRate, 'share of benign prompts wrongly blocked').toBeLessThanOrEqual(THRESHOLDS.guardFalsePositive);
  });
});
