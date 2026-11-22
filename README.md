# LLM QA Showcase: testing an AI chatbot

[![CI](https://github.com/RobBrowning/llm-qa-showcase/actions/workflows/ci.yml/badge.svg)](https://github.com/RobBrowning/llm-qa-showcase/actions/workflows/ci.yml)
[![Claude PR Review](https://github.com/RobBrowning/llm-qa-showcase/actions/workflows/claude-review.yml/badge.svg)](https://github.com/RobBrowning/llm-qa-showcase/actions/workflows/claude-review.yml)

How I'd test an AI chatbot as a QA lead: **layered checks, an independent judge that has to earn trust, and seeded defects to prove the suite catches what it claims to.**

The system under test is **Wheelwise help**, a small chatbot for a fictional bike-hire company. It answers from four short documents using open [Hugging Face](https://huggingface.co) models that run locally in Node through [Transformers.js](https://huggingface.co/docs/transformers.js). There are no paid APIs and no keys, and every run is repeatable.

**Twin repos:** [playwright-qa-showcase](https://github.com/RobBrowning/playwright-qa-showcase) and [cypress-qa-showcase](https://github.com/RobBrowning/cypress-qa-showcase) cover classic UI and API automation. This one covers what changes when the product is a model.

## What to look at

- **[`docs/test-strategy.md`](docs/test-strategy.md)**: the five layers, what each proves, what is deliberately not automated.
- **[`tests/eval/`](tests/eval)**: one spec per layer: facts, refusals, safety, toxicity, judge, consistency.
- **[`src/app/defects.ts`](src/app/defects.ts)**: five realistic seeded bugs, and the [defect matrix](#defect-matrix) that shows which layer catches each.
- **[ADR 0002](docs/adr/0002-pinned-models-and-independent-judge.md)**: why the judge is a different model family, and why it must pass calibration against hand labels before its verdicts count.
- **[`data/`](data)**: golden answers, attacks, consistency groups and judge calibration labels, all traceable to [`kb/`](kb).
- **[`.github/claude-review-prompt.md`](.github/claude-review-prompt.md)**: the AI PR reviewer, tuned to catch the classic eval cheat of loosening a check until a wrong answer passes.

## How it works

```
question ──> injection guard ──> keyword retrieval ──> Qwen2.5 0.5B ──> reply
             (DeBERTa classifier)  (kb/, scope check)   (top 2 chunks)
```

| Role | Model | Family |
|---|---|---|
| Chatbot | `onnx-community/Qwen2.5-0.5B-Instruct` | Qwen |
| Injection guard | `protectai/deberta-v3-base-prompt-injection-v2` | DeBERTa |
| Judge | `HuggingFaceTB/SmolLM2-1.7B-Instruct` | SmolLM2 |
| Toxicity | `Xenova/toxic-bert` | BERT |
| Attack data | `deepset/prompt-injections` (pinned sample) | Dataset |

Every model and the dataset are pinned to a revision, and generation is greedy, so the same input gives the same output on every run.

## Test layers

| Layer | Checks | Kind |
|---|---|---|
| Facts | 14 golden questions return the exact published price, time or rule | Deterministic |
| Refusals | Off-topic questions are refused; unknown services aren't invented | Deterministic |
| Safety | Attacks never leak the system prompt canary; guard recall and false-positive rate on a public dataset | Classifier + deterministic |
| Toxicity | No reply is rude, refusals included | Classifier, with a gate test |
| Judge | Judge calibrated on hand labels, then rates golden answers for groundedness | LLM-as-judge |
| Consistency | Three phrasings of a question give the same fact | Deterministic |
| UI and API | Chat page states and errors, API contract | Playwright, stub mode |

## Defect matrix

`npm run eval:defects` runs the eval suite on the fixed build, then once per seeded defect:

| Defect | Bug | Expected catch |
|---|---|---|
| `price-format` | £12.50 shown as £1250 | facts, consistency |
| `no-scope-guard` | Off-topic questions reach the model | refusals |
| `no-injection-guard` | Attacks reach the model unfiltered | safety |
| `wrong-doc` | Retrieval off by one | facts, judge |
| `placeholder-copy` | Rude placeholder shipped as the refusal | refusals, safety, toxicity |

_Results from the first CI run go here._

## Quick start

```bash
git clone https://github.com/RobBrowning/llm-qa-showcase.git
cd llm-qa-showcase
nvm use               # Node 22
npm ci
npm run start:stub    # chat page on http://localhost:3100, no models
npm start             # same with real models (downloads on first question)
```

Tests:

```bash
npm run check:unit    # offline data and retrieval checks, no models
npm run test:ui       # chat page and API contract (npx playwright install chromium first)
npm run data:fetch    # pinned public attack sample
npm run test:eval     # full eval with real models (first run downloads about 2.5 GB)
npm run test:smoke    # the PR subset
npm run eval:defects  # defect matrix -> results/defect-matrix.md
```

## Roadmap

- [x] MVP: chatbot, five layers, seeded defects, CI with cached models
- [ ] First full CI run: record judge calibration, guard metrics and the defect matrix here
- [ ] Ruleset on main to match the twins: required checks, resolved threads, squash only
- [ ] Case study: classic automation and the qa-toolkit verifier testing this bot together, with measured outcomes
- [ ] Optional larger hosted judge, if the local one fails calibration (new ADR)

## About

Built by [Rob Browning](https://github.com/RobBrowning), QA lead with 18+ years in testing, using Claude Code as a pair. Wheelwise is fictional; phone numbers use Ofcom's drama range and the email uses a reserved `.example` domain.
