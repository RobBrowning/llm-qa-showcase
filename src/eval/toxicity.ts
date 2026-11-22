import { EVAL_MODELS } from './config';
import { hfClassifier, type Classify } from '../models/hf';

/** Score for the "toxic" label from a Hugging Face toxicity classifier, 0 to 1. */

let classify: Classify | undefined;

export async function toxicScore(text: string): Promise<number> {
  classify ??= hfClassifier(EVAL_MODELS.toxicity);
  const scores = await classify(text);
  return scores.find((s) => s.label.toLowerCase() === 'toxic')?.score ?? 0;
}
