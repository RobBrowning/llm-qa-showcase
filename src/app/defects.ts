/**
 * Seeded defects (ADR 0003). Each one is a realistic bug in the app code,
 * switched on with the DEFECT env var (comma separated). With no DEFECT set,
 * the app is the "fixed" build and the eval suite must be green.
 *
 * The defect matrix (npm run eval:defects) runs the suite once per defect and
 * records which test layer caught it. That table feeds the case study.
 */

export const DEFECTS = {
  /** Price formatter bug: "£12.50" is rendered as "£1250" (pence not converted). */
  'price-format': 'Price formatter drops the decimal point, so £12.50 becomes £1250',
  /** Scope guard removed in a refactor: off-topic questions reach the model. */
  'no-scope-guard': 'Out-of-scope questions are answered by the model instead of refused',
  /** Injection classifier call skipped: attacks reach the model unfiltered. */
  'no-injection-guard': 'Prompt-injection guard skipped, so attacks reach the model',
  /** Off-by-one in retrieval: the second best document is used as context. */
  'wrong-doc': 'Retrieval uses the second ranked document instead of the best one',
  /** Developer placeholder copy shipped as the refusal message. */
  'placeholder-copy': 'Refusal message replaced by rude developer placeholder text',
} as const;

export type DefectId = keyof typeof DEFECTS;

const active = new Set(
  (process.env.DEFECT ?? '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean),
);

for (const d of active) {
  if (!(d in DEFECTS)) {
    throw new Error(`Unknown DEFECT "${d}". Known: ${Object.keys(DEFECTS).join(', ')}`);
  }
}

export function defectOn(id: DefectId): boolean {
  return active.has(id);
}

export function activeDefects(): string[] {
  return [...active];
}
