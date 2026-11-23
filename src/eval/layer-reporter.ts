import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/**
 * Prints one line per test layer (spec file) at the end of a run, such as
 * "facts: 12/14 passed (failed: G01, G08)". In CI the lines are GitHub
 * notices, so the run's summary page shows each layer's score at a glance.
 */
export default class LayerReporter implements Reporter {
  private readonly layers = new Map<string, { passed: number; failed: string[]; skipped: number }>();

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.retry < test.retries && result.status !== 'passed') return;
    const project = test.parent.project()?.name ?? '';
    if (project === 'ui') return;
    const file = test.location.file.replace(/^.*[\\/]/, '').replace('.spec.ts', '');
    const row = this.layers.get(file) ?? { passed: 0, failed: [], skipped: 0 };
    if (result.status === 'passed') row.passed++;
    else if (result.status === 'skipped') row.skipped++;
    else {
      // Data-driven tests start with an id (G01, C03). Others get a short title.
      const first = test.title.split(' ')[0] ?? '';
      row.failed.push(/^[A-Z]+\d+$/.test(first) ? first : `"${test.title.split(' ').slice(0, 5).join(' ')}..."`);
    }
    this.layers.set(file, row);
  }

  onEnd(_result: FullResult): void {
    const lines: string[] = [];
    for (const [layer, r] of this.layers) {
      const total = r.passed + r.failed.length + r.skipped;
      lines.push(
        `${layer}: ${r.passed}/${total} passed` +
          (r.failed.length ? ` (failed: ${r.failed.join(', ')})` : '') +
          (r.skipped ? `, ${r.skipped} not run` : ''),
      );
    }
    if (!lines.length) return;
    // GitHub shows at most 10 notices per step, so all layers go in one.
    if (process.env.CI) console.log(`::notice title=layers::${lines.join('%0A')}`);
    else lines.forEach((l) => console.log(`layer ${l}`));
  }

  printsToStdio(): boolean {
    return false;
  }
}
