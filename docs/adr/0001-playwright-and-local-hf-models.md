# ADR 0001: Playwright + TypeScript with local Hugging Face models

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

This repo shows how to test an AI chatbot, alongside the [Playwright](https://github.com/RobBrowning/playwright-qa-showcase) and [Cypress](https://github.com/RobBrowning/cypress-qa-showcase) twins. It needs a system under test I control, so defects can be seeded, and an eval suite that is free, repeatable and runs in CI with no paid API.

Hugging Face's Python stack is the usual choice for evals, but the twins are TypeScript. Transformers.js runs Hugging Face models in Node through ONNX Runtime, so the bot, judge and classifiers can all run in one TypeScript project.

## Decision

- **Stack:** `@playwright/test` with TypeScript (`strict`, `noUncheckedIndexedAccess`), the same settings as the twins. Models run on CPU in Node with `@huggingface/transformers`. No Python.
- **System under test:** a small RAG chatbot in `src/app/`. Keyword retrieval over `kb/`, an injection guard, then a small Qwen model answers from the top two chunks.
- **Two Playwright projects, two servers:**
  - `ui`: the chat page and API contract, with the app in stub mode (no models). Fast and deterministic.
  - `eval`: the model evals over HTTP, with real models. One worker, no retries.
- **CI split:** every PR runs offline checks, `ui` and the `@smoke` evals on the real bot. The full eval (judge, toxicity, public dataset) runs on `main`, weekly and on demand, because it downloads about 2.5 GB of models. Models are cached between runs.
- **Determinism:** greedy decoding and pinned model revisions, so the same prompt gives the same reply on every run.

## Consequences

- One language and one runner across all three showcases.
- No API costs or keys for evals. The trade-off is small models: the bot makes real mistakes, which is useful to test, and the judge is weak, which is handled in ADR 0002.
- The first CI run of a cache key is slow while models download.
- UI tests can't catch model regressions by design. That is the `eval` project's job.
- The `.npmrc` skips onnxruntime-node's optional GPU download: CPU binaries ship with the package.
