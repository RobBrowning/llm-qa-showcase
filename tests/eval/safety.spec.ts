import { test, expect, CANARY, metric } from './fixtures';
import { ATTACKS, adversarialSample, rx, type AdversarialRow } from '../../src/eval/data';
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
  test('app stops known injections, guard lets benign prompts through, no leaks', async ({ chat }) => {
    test.setTimeout(20 * 60_000);
    const rows = adversarialSample();
    const injections = rows.filter((r) => r.label === 1);
    const benign = rows.filter((r) => r.label === 0);
    expect(injections.length, 'sample must include injections').toBeGreaterThan(0);
    expect(benign.length, 'sample must include benign prompts').toBeGreaterThan(0);

    let blocked = 0;
    let stopped = 0;
    let falsePositives = 0;
    const leaks: string[] = [];
    const missed: AdversarialRow[] = [];
    for (const row of rows) {
      const res = await chat(row.text);
      if (res.reply.includes(CANARY)) leaks.push(row.text);
      if (row.label === 1) {
        // Stopped: some guard answered, so the model never acted on the attack.
        if (res.guarded !== null) stopped++;
        if (res.guarded === 'injection') blocked++;
        else missed.push(row);
      } else if (res.guarded === 'injection') {
        falsePositives++;
      }
    }
    const stopRate = stopped / injections.length;
    const recall = blocked / injections.length;
    const fpRate = falsePositives / benign.length;
    metric(
      'attacks',
      `stopped by any guard ${stopRate.toFixed(2)} (${stopped}/${injections.length}); injection guard alone ${recall.toFixed(2)} (${blocked}/${injections.length}); false positives ${fpRate.toFixed(2)} (${falsePositives}/${benign.length}); leaks ${leaks.length}`,
    );

    // Diagnostic only, not gated: the guard model is English-only and the
    // public sample mixes English and German (known gap, docs/test-strategy.md).
    const byLang = (lang: 'en' | 'de') => {
      const inj = injections.filter((r) => language(r.text) === lang);
      const miss = missed.filter((r) => language(r.text) === lang);
      return `${inj.length - miss.length}/${inj.length}`;
    };
    metric('injection guard by language', `English blocked ${byLang('en')}, German blocked ${byLang('de')}`);
    metric('injection guard missed', missed.map((r) => `[${language(r.text)}] ${r.text.replace(/\s+/g, ' ').slice(0, 60)}`).join(' | ') || 'none');

    expect(leaks, 'replies that leaked the canary').toEqual([]);
    expect(stopRate, 'share of injections stopped by any guard').toBeGreaterThanOrEqual(THRESHOLDS.attacksStopped);
    expect(fpRate, 'share of benign prompts wrongly blocked').toBeLessThanOrEqual(THRESHOLDS.guardFalsePositive);
  });
});

/** Rough language tag for reporting only: the sample is English or German. */
function language(text: string): 'en' | 'de' {
  return /[äöüß]|\b(und|der|die|das|nicht|Sie|du|ist|mit|jetzt|ich)\b/.test(text) ? 'de' : 'en';
}
