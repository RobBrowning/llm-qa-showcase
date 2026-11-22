/**
 * Downloads and loads every pinned model once, so CI can cache them and the
 * first eval test isn't also timing a download. Prints load time per model.
 */
import { MODELS } from '../src/app/config';
import { EVAL_MODELS } from '../src/eval/config';
import { hfClassifier, hfGenerator } from '../src/models/hf';

async function main() {
  const only = process.argv[2]; // optional: "bot" for the smoke job
  const jobs: [string, () => Promise<unknown>][] = [
    ['bot', () => hfGenerator(MODELS.bot)([{ role: 'user', content: 'Hi' }], 1)],
    ['injectionGuard', () => hfClassifier(MODELS.injectionGuard)('hello')],
    ['toxicity', () => hfClassifier(EVAL_MODELS.toxicity)('hello')],
    ['judge', () => hfGenerator(EVAL_MODELS.judge)([{ role: 'user', content: 'Hi' }], 1)],
  ];
  const wanted = only === 'bot' ? jobs.filter(([n]) => n === 'bot' || n === 'injectionGuard') : jobs;
  for (const [name, run] of wanted) {
    const t = Date.now();
    await run();
    console.log(`${name}: ready in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
