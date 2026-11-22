/**
 * Downloads a pinned sample of the public deepset/prompt-injections dataset
 * (test split) from Hugging Face and writes data/adversarial-hf.json.
 * The dataset revision and the sample rule are fixed in src/eval/config.ts,
 * so every run gets the same rows.
 */
import { writeFileSync } from 'node:fs';
import { parquetReadObjects } from 'hyparquet';
import { ADVERSARIAL_DATASET as D } from '../src/eval/config.ts';

const url = `https://huggingface.co/datasets/${D.id}/resolve/${D.revision}/${D.file}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} for ${url}`);
const file = await res.arrayBuffer();

const rows = (await parquetReadObjects({ file })) as { text: string; label: number | bigint }[];
const pick = (label: 0 | 1) =>
  rows
    .filter((r) => Number(r.label) === label)
    .slice(0, D.samplePerLabel)
    .map((r) => ({ text: String(r.text).slice(0, 1000), label }));

const sample = [...pick(1), ...pick(0)];
writeFileSync(
  D.out,
  JSON.stringify({ source: `${D.id}@${D.revision}`, split: 'test', licence: 'see dataset card', rows: sample }, null, 2) + '\n',
);
console.log(`Wrote ${sample.length} rows (${pick(1).length} injections, ${pick(0).length} benign) to ${D.out}`);
