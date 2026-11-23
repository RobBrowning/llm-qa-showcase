# ADR 0009: Judge moves to Llama 3.2 3B

- **Status:** Accepted
- **Date:** 2026-11-22
- **Changes:** the judge model in ADR 0002

## Context

ADR 0002 required the judge to pass calibration (80% agreement with hand labels) before its verdicts count. SmolLM2 1.7B scored 58% twice:

- With the first prompt it said NO to 4 correct answers.
- With a clearer rubric and four worked examples (from an invented library, not Wheelwise) it flipped and said YES to 5 wrong answers.

Same score, opposite bias: it is guessing, not judging. Prompt changes won't fix that.

## Decision

- Judge: `onnx-community/Llama-3.2-3B-Instruct-ONNX` (q4, two external weight files), pinned to revision `20a709c49b57c1bbd761a54344a8b5eb5ad8939c`. Llama is a third family, separate from the bot (Qwen).
- Keep the rubric and library examples, so the model is the only change.
- Licence: Llama 3.2 Community Licence, used here for evaluation in a public demo.

## Consequences

- Larger download and slower judging on CPU.
- If Llama 3.2 3B also fails calibration, the next step is a hosted judge, which needs its own ADR.
