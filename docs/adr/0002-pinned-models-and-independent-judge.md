# ADR 0002: Pinned models and an independent, calibrated judge

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

An LLM judge marking answers from a model trained the same way can share its blind spots, the same problem as a tester signing off their own work. And a judge is itself a test tool: if nobody checks it, a pass means nothing.

## Decision

**Models, all pinned to a Hugging Face revision:**

| Role | Model | Family | Where |
|---|---|---|---|
| Chatbot | `onnx-community/Qwen2.5-1.5B-Instruct` (q4), 0.5B until ADR 0008 | Qwen | `src/app/config.ts` |
| Injection guard (part of the app) | `protectai/deberta-v3-base-prompt-injection-v2` | DeBERTa | `src/app/config.ts` |
| Judge | `HuggingFaceTB/SmolLM2-1.7B-Instruct` (q4) | SmolLM2 | `src/eval/config.ts` |
| Toxicity check | `Xenova/toxic-bert` (q8) | BERT | `src/eval/config.ts` |

- **The judge must be a different family from the bot,** and never Claude, which writes this repo's code.
- **Calibrate before trusting.** `judge.spec.ts` is serial. Its first test runs the judge on hand-labelled answers in `data/judge-calibration.json`. If agreement is below 80%, the test fails and the bot is not judged.
- **Gate tests for classifiers.** The toxicity check first proves it flags a known rude reply.
- **Deterministic checks first.** Facts, refusals and canary leaks are plain assertions. The judge adds a second opinion; it does not replace them.
- **Thresholds** live in `src/eval/config.ts`. Changing one needs a new ADR.
- **Public test data** comes from `deepset/prompt-injections`, pinned to a revision, with a fixed sample of 20 injections and 20 benign prompts from the test split.

## Consequences

- The judge can be swapped with `JUDGE_MODEL` and `JUDGE_REVISION` without code changes. Calibration decides whether it is trusted.
- A 1.7B judge may well fail calibration. That is a result, not a bug: the README records it, and the fallback is a larger hosted judge, which needs its own ADR.
- The calibration labels were drafted with AI help and need human review. Any change to that file needs the same.
