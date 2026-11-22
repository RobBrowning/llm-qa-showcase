import { EVAL_MODELS } from './config';
import { hfGenerator, type Generate } from '../models/hf';

/**
 * LLM-as-judge: asks a model from a different family whether an answer is
 * correct and fully supported by a reference chunk. One word out, YES or NO,
 * greedy decoding, so a verdict is repeatable.
 *
 * The judge is only trusted after it agrees with hand labels (judge.spec.ts).
 */

export type Verdict = 'YES' | 'NO' | 'UNPARSEABLE';

const JUDGE_SYSTEM = `You are a strict fact checker for a customer help chatbot.
You compare an ANSWER with a REFERENCE text.
Reply YES only if the ANSWER responds to the QUESTION and every fact in it is stated in the REFERENCE.
Reply NO if any fact in the ANSWER is missing from, or contradicts, the REFERENCE.
Reply with exactly one word: YES or NO.`;

let generate: Generate | undefined;

export async function judge(reference: string, question: string, answer: string): Promise<Verdict> {
  generate ??= hfGenerator(EVAL_MODELS.judge);
  const raw = await generate(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: `REFERENCE:\n${reference}\n\nQUESTION: ${question}\n\nANSWER: ${answer}\n\nYES or NO?` },
    ],
    3,
  );
  return parseVerdict(raw);
}

export function parseVerdict(raw: string): Verdict {
  const first = raw.trim().toUpperCase().match(/^[^A-Z]*([A-Z]+)/)?.[1];
  if (first === 'YES') return 'YES';
  if (first === 'NO') return 'NO';
  return 'UNPARSEABLE';
}
