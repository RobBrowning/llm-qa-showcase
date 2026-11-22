# LLM QA Showcase: Claude Code project context

This is **llm-qa-showcase**: a Playwright + TypeScript eval suite for **Wheelwise**, a fictional bike-hire help chatbot. The bot is a small RAG app running open Hugging Face models locally in Node through Transformers.js.

**Status (updated 2026-11-22):** MVP. App, five test layers, seeded defects and CI exist. First real model runs happen in CI.

## Hard rule

Never use an em dash or en dash in any file. Use a colon, comma or full stop instead. Ordinary hyphens in compound words are fine.

## Commands

- `npm run typecheck` and `npm run check:unit`: must pass before any commit (no models needed)
- `npm run test:ui`: chat page and API contract, stub mode, seconds
- `npm run test:eval`: real models, run `npm run data:fetch` first. Slow on first run while models download
- `npm run test:smoke`: the PR subset
- `npm run eval:defects`: defect matrix, writes `results/defect-matrix.md`
- `npm start` / `npm run start:stub`: run the chatbot on http://localhost:3100

## Layout

- `kb/`: the knowledge base. **Source of truth** for every expected answer.
- `src/app/`: the chatbot (retrieval, guards, generation, server). `defects.ts` holds the seeded defects.
- `src/models/hf.ts`: Transformers.js loaders shared by app and evals.
- `src/eval/`: judge, toxicity classifier, thresholds, data loaders.
- `data/`: golden set, scope, attacks, consistency, judge calibration.
- `tests/ui/`: stub mode. `tests/eval/`: real models, one file per layer.

## Rules

- Expected facts and labels come from `kb/`. Never change a golden answer, regex or label to match what a model now says. If an answer is wrong, the bot is wrong.
- Thresholds live in `src/eval/config.ts`. Changing one needs a new ADR.
- Pin every model and dataset to a revision.
- Any new classifier or judge check needs a gate test that proves it can fail (see `toxicity.spec.ts` and the judge calibration).
- No retries on the `eval` project. A flaky eval is a finding, not noise.
- UI tests run in stub mode and never assert on model wording.
- Seeded defects stay behind the `DEFECT` env var. Each one is listed in `docs/test-strategy.md` with the layer expected to catch it.
- Locators: `getByTestId` (attribute `data-test`) or `getByRole`. No CSS chains, no XPath.
- New tests must name the manual check they replace. If none, propose adding it to the "not automated" table in `docs/test-strategy.md`.
- Record any structural decision as a new ADR in `docs/adr/`.

## AI PR review

- Every non-draft PR gets an automatic review from `.github/workflows/claude-review.yml`, using `.github/claude-review-prompt.md`. Comments only.
- If you change a rule in this file, change the review prompt in the same PR.
- Fill in the PR template's Acceptance criteria: the reviewer checks each one has a test.
- `@claude` in a PR or issue comment asks Claude a follow-up question.

## Do not

- Commit `.env`, `.cache/`, reports, `results/` or `test-results/`.
- Use Claude, or any model from the bot's family, as the judge. The judge must be independent (ADR 0002).
