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

const JUDGE_SYSTEM = `You check answers from a customer help chatbot against a REFERENCE text.
Reply YES if the ANSWER responds to the QUESTION and its facts (numbers, times, ages, rules) match the REFERENCE. Wording can differ.
Reply NO if a fact in the ANSWER is different from the REFERENCE, or is not in it at all.
Reply with exactly one word: YES or NO.`;

/**
 * Worked examples from an unrelated, invented business (a library), so the
 * judge learns the task without being tuned to the Wheelwise calibration set.
 */
const EXAMPLES: { reference: string; question: string; answer: string; verdict: 'YES' | 'NO' }[] = [
  {
    reference: 'Late returns: books returned late are charged 20p per day. DVDs are charged £1.00 per day.',
    question: 'What is the fine for a late DVD?',
    answer: 'Late DVDs cost £1 a day.',
    verdict: 'YES',
  },
  {
    reference: 'Late returns: books returned late are charged 20p per day. DVDs are charged £1.00 per day.',
    question: 'What is the fine for a late DVD?',
    answer: 'Late DVDs are charged 20p per day.',
    verdict: 'NO',
  },
  {
    reference: 'Membership: anyone aged 14 or over can join on their own. Under 14s need a parent to sign.',
    question: 'Can a 12 year old join without a parent?',
    answer: 'No, under 14s need a parent to sign.',
    verdict: 'YES',
  },
  {
    reference: 'Membership: anyone aged 14 or over can join on their own. Under 14s need a parent to sign.',
    question: 'Can a 12 year old join without a parent?',
    answer: 'Yes, anyone can join on their own.',
    verdict: 'NO',
  },
];

const prompt = (reference: string, question: string, answer: string) =>
  `REFERENCE:\n${reference}\n\nQUESTION: ${question}\n\nANSWER: ${answer}\n\nYES or NO?`;

let generate: Generate | undefined;

export async function judge(reference: string, question: string, answer: string): Promise<Verdict> {
  generate ??= hfGenerator(EVAL_MODELS.judge);
  const raw = await generate(
    [
      { role: 'system', content: JUDGE_SYSTEM },
      ...EXAMPLES.flatMap((e) => [
        { role: 'user' as const, content: prompt(e.reference, e.question, e.answer) },
        { role: 'assistant' as const, content: e.verdict },
      ]),
      { role: 'user', content: prompt(reference, question, answer) },
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
