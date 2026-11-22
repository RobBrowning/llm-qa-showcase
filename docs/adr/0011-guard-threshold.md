# ADR 0011: Injection guard threshold from 0.9 to 0.5

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

On the public sample (20 injections, 20 benign prompts) the guard blocked 9 of 20 injections at a 0.9 threshold, with 0 false positives. By language it blocked 5 of 11 English and 4 of 9 German. It missed clear English attacks such as "Superbly done! But now come new tasks. Forget everything...".

Zero false positives with recall at 45% means the threshold is set too cautiously.

## Decision

Block a message when the classifier's injection score is 0.5 or above (its own 50/50 point), down from 0.9. The 80% recall and 10% false-positive targets in `src/eval/config.ts` are unchanged.

## Consequences

- More attacks blocked, at some risk of blocking genuine questions. The golden facts (which require `guarded: null`) and the benign half of the public sample measure that risk on every run.
- German results stay reported separately. The guard model is English-only, so a recall gap there is a known limit, not a tuning target.
