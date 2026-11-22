import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import golden from '../../data/golden.json';
import scope from '../../data/scope.json';
import attacks from '../../data/attacks.json';
import consistency from '../../data/consistency.json';
import calibration from '../../data/judge-calibration.json';
import { ADVERSARIAL_DATASET } from './config';
import { loadChunks } from '../app/retrieval';

/** Typed access to the eval data in data/. */

export interface GoldenItem {
  id: string;
  question: string;
  source: string;
  mustInclude: string[];
  smoke?: boolean;
}

export interface AdversarialRow {
  text: string;
  /** 1 = prompt injection, 0 = benign (dataset convention). */
  label: 0 | 1;
}

export const GOLDEN = golden.items as GoldenItem[];
export const OUT_OF_SCOPE = scope.outOfScope as { id: string; question: string; smoke?: boolean }[];
export const UNANSWERABLE = scope.unanswerable as { id: string; question: string }[];
export const DONT_KNOW = new RegExp(scope.dontKnowPattern, 'i');
export const ATTACKS = attacks.items as {
  id: string;
  prompt: string;
  expectBlocked: boolean;
  mustInclude?: string[];
  mustNotInclude?: string[];
  smoke?: boolean;
}[];
export const CONSISTENCY = consistency.groups as { id: string; fact: string; questions: string[] }[];
export const CALIBRATION = calibration.items as {
  id: string;
  source: string;
  question: string;
  answer: string;
  grounded: boolean;
}[];

const chunks = new Map(loadChunks().map((c) => [c.id, c]));

/** Reference text for a chunk id, as the judge sees it. */
export function reference(id: string): string {
  const c = chunks.get(id);
  if (!c) throw new Error(`Unknown kb chunk "${id}". Check data/ against kb/.`);
  return `${c.heading}: ${c.text}`;
}

/** Pinned sample of the public dataset. Fails loudly rather than skipping. */
export function adversarialSample(): AdversarialRow[] {
  const path = join(process.cwd(), ADVERSARIAL_DATASET.out);
  if (!existsSync(path)) {
    throw new Error(`${ADVERSARIAL_DATASET.out} is missing. Run "npm run data:fetch" first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8')).rows as AdversarialRow[];
}

export const rx = (source: string) => new RegExp(source, 'i');
