# Test Strategy

## Purpose

Show a realistic, layered way to test an AI chatbot: cheap deterministic checks first, models judging models only where a plain assertion can't, and evidence that the suite actually catches bugs.

**Guiding principle: less better, not more faster.** Every automated check replaces a named manual check. A model-based check is trusted only after it has been shown to fail on a known bad input.

## System under test

**Wheelwise help**, a fictional bike-hire chatbot. It answers only from four short documents in `kb/` (prices, bookings and refunds, rules and safety, locations and hours). Everything is invented, so every expected answer can be checked against `kb/`.

## Layers

| # | Layer | Spec | What it proves | Model needed | On PRs |
|---|---|---|---|---|---|
| 0 | Offline self-check | `scripts/self-check.ts` | Every eval question retrieves the right chunk, every expected fact is really in `kb/`, the price formatter works | None | Yes |
| 1 | Facts | `facts.spec.ts` | 14 golden questions: right chunk, exact published fact, not blocked, no prompt leak | Bot | `@smoke` subset |
| 1 | Refusals | `refusals.spec.ts` | Off-topic questions get the fixed refusal. Unanswerable on-topic questions get "don't know", not an invented service | Bot | `@smoke` subset |
| 2 | Safety | `safety.spec.ts` | Hand-written attacks never leak the canary and are blocked when expected. On the public dataset, guard recall at least 80% and false positives at most 10% | Bot, guard | `@smoke` subset |
| 2 | Toxicity | `toxicity.spec.ts` | No reply, refusals included, scores above 0.5 toxic. Gate test proves the classifier can fail | Toxicity classifier | No |
| 3 | Judge | `judge.spec.ts` | Judge agrees with hand labels (at least 80%), then rates at least 80% of golden answers grounded | Judge | No |
| 4 | Consistency | `consistency.spec.ts` | The same fact comes back for three phrasings of each question | Bot | No |
| 5 | UI and API | `tests/ui/` | Chat page states, ordering, loading, errors; API status codes and response shape | None (stub) | Yes |

## Seeded defects

See ADR 0003. Run with `npm run eval:defects` or the **Defect matrix** workflow.

| Defect | Expected to be caught by |
|---|---|
| `price-format` | facts, consistency |
| `no-scope-guard` | refusals |
| `no-injection-guard` | safety |
| `wrong-doc` | facts, judge |
| `placeholder-copy` | refusals, safety, toxicity |

## Deliberately not automated (and why)

| Item | Reason |
|---|---|
| Judging tone, helpfulness or style | A 1.7B judge can't do it reliably and it isn't a release risk for a help bot. Toxicity is the tone check that matters, and it is a classifier. |
| Multi-turn memory | The bot is single-turn by design. The UI test only checks the transcript keeps every turn in order. |
| Load and latency | CPU inference in CI isn't representative. Belongs in a performance tool against the real deployment. |
| Every row of the public dataset | A pinned sample of 40 rows is repeatable and fast. The full set adds runtime, not confidence. |
| Non-English prompts beyond what the public sample contains | The bot and `kb/` are English only. Recorded as a known gap. |

## Known limits

- Small models make real mistakes. A red eval on the fixed build is a finding about the bot, and is triaged like any defect, never fixed by editing the expected answer.
- The judge calibration labels were drafted with AI help and need human review (ADR 0002).
