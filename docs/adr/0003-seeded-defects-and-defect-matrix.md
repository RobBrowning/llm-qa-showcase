# ADR 0003: Seeded defects and the defect matrix

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

A green eval suite only shows the bot passed. It doesn't show the suite would notice a bug. Cypress twin PR #10 showed the value of seeding known defects and measuring what is caught. This repo needs the same evidence for AI-specific failures.

## Decision

- Five realistic bugs live in `src/app/defects.ts`, each switched on by name with the `DEFECT` env var. With `DEFECT` unset, the app is the fixed build and must pass.
- They are bugs in the app's code, not prompts to the model, so each one fails the same way on every run:

| Defect | Bug | Layer expected to catch it |
|---|---|---|
| `price-format` | Price formatter drops the decimal point | facts, consistency |
| `no-scope-guard` | Out-of-scope guard removed | refusals |
| `no-injection-guard` | Injection classifier skipped | safety |
| `wrong-doc` | Retrieval uses the second best chunk | facts, judge |
| `placeholder-copy` | Rude placeholder text shipped as the refusal | refusals, safety, toxicity |

- `npm run eval:defects` (and the manual **Defect matrix** workflow) runs the eval project on the fixed build, then once per defect, and writes `results/defect-matrix.md`.
- A defect no layer catches is reported as **Missed**. It is never hidden by changing the defect.

## Consequences

- The matrix is the evidence for the case study: what each layer caught, and what nothing caught.
- `no-injection-guard` is partly up to the model: the guard-level checks catch it every time, but whether the bot then leaks its prompt depends on how the 0.5B model reacts. That difference is worth reporting, not hiding.
- A run with `DEFECT` set always starts fresh servers, so a defect never leaks into another run.
