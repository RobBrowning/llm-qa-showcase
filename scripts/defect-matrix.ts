/**
 * Defect matrix (ADR 0003): runs the eval suite once on the fixed build and
 * once per seeded defect, then writes results/defect-matrix.md showing which
 * test layer caught each defect. This is the evidence for the case study.
 *
 *   npm run eval:defects                 all defects
 *   npm run eval:defects -- wrong-doc    one defect
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { DEFECTS } from '../src/app/defects';

interface PwSpec { title: string; file: string; tests: { results: { status: string }[] }[] }
interface PwSuite { title: string; file?: string; specs?: PwSpec[]; suites?: PwSuite[] }

const LAYERS = ['facts', 'refusals', 'safety', 'toxicity', 'consistency', 'judge'] as const;

function run(defect: string): Map<string, { failed: string[]; total: number }> {
  const out = `results/run-${defect || 'baseline'}.json`;
  const t = Date.now();
  spawnSync('npx', ['playwright', 'test', '--project=eval', '--reporter=json'], {
    env: { ...process.env, DEFECT: defect, PLAYWRIGHT_JSON_OUTPUT_NAME: out },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log(`${defect || 'baseline'}: ${((Date.now() - t) / 60000).toFixed(1)} min`);

  const report = JSON.parse(readFileSync(out, 'utf8')) as { suites: PwSuite[] };
  const byLayer = new Map<string, { failed: string[]; total: number }>(LAYERS.map((l) => [l, { failed: [], total: 0 }]));
  const walk = (s: PwSuite) => {
    for (const spec of s.specs ?? []) {
      const layer = spec.file.replace(/^.*\//, '').replace('.spec.ts', '');
      const row = byLayer.get(layer);
      if (!row) continue;
      row.total++;
      const status = spec.tests[0]?.results.at(-1)?.status;
      if (status !== 'passed') row.failed.push(spec.title.split(' ')[0] ?? spec.title);
    }
    for (const child of s.suites ?? []) walk(child);
  };
  report.suites.forEach(walk);
  return byLayer;
}

mkdirSync('results', { recursive: true });
const picked = process.argv.slice(2);
const defects = ['', ...(picked.length ? picked : Object.keys(DEFECTS))];

const header = `| Build | ${LAYERS.join(' | ')} | Caught? |\n|---|${LAYERS.map(() => '---').join('|')}|---|`;
const lines: string[] = [];
for (const d of defects) {
  const res = run(d);
  const cells = LAYERS.map((l) => {
    const r = res.get(l)!;
    return r.failed.length ? `❌ ${r.failed.length}/${r.total} (${r.failed.slice(0, 4).join(', ')}${r.failed.length > 4 ? ', ...' : ''})` : `✅ ${r.total}`;
  });
  const anyFail = LAYERS.some((l) => res.get(l)!.failed.length > 0);
  const verdict = d ? (anyFail ? 'Yes' : '**Missed**') : anyFail ? '**Baseline not green**' : 'Baseline green';
  lines.push(`| ${d || 'fixed build'} | ${cells.join(' | ')} | ${verdict} |`);
}

const md = `# Defect matrix\n\nGenerated ${new Date().toISOString()} by \`npm run eval:defects\`. Each row runs the eval project once; ❌ shows failed tests per layer.\n\n${header}\n${lines.join('\n')}\n\n${Object.entries(DEFECTS)
  .map(([k, v]) => `- \`${k}\`: ${v}`)
  .join('\n')}\n`;
writeFileSync('results/defect-matrix.md', md);
console.log(md);
