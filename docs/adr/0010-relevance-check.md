# ADR 0010: Relevance check with a reranker before the bot answers

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

"Can I hire a bike for my dog to ride in a trailer?" passes the keyword scope guard because "hire" and "ride" match the age rules paragraph. The bot then invents a rule about dogs. Two prompt changes failed:

- Fix 4 (state the rule, never invent one): the bot still invented the rule.
- Fix 5 (repeat the don't-know rule next to the question): it stopped inventing, but then said "I don't know" to four answerable questions. It was reverted.

A 1.5B model can't reliably decide when it doesn't know. That decision should not be the model's.

## Decision

- After retrieval, a cross-encoder reranker, `Xenova/bge-reranker-base` (q8, pinned to `280bcc27a84e0b898c251e06fddb25171bd9b101`), scores how well the best paragraph answers the question.
- Below 0, the model's own 50/50 point, the app replies with a fixed "I don't know" message and the bot is never asked. The response is marked `guarded: "relevance"`.
- The threshold is the model's natural midpoint, not tuned to the eval set. The hold-out set checks it on unseen questions.
- The `no-scope-guard` seeded defect switches this check off too, as it is part of deciding scope.

## Model choice, from evidence

The first reranker tried, `Xenova/ms-marco-MiniLM-L-6-v2`, fixed the dog question but refused "How big is the deposit?". `tests/eval/relevance-report.spec.ts` printed its scores: every answerable eval question scored 1.5 or more except that one, at -3.7, which was *below* the two truly unanswerable questions (-2.6, -3.5). No threshold could separate them, so the model was replaced rather than the threshold tuned. The report stays in the suite so the scores remain visible.

## Consequences

- "Don't know" becomes a deterministic, explainable decision: a score and a line, not a prompt.
- One more model (about 280 MB at q8) to download and run per question.
- If a real question scores below 0, it is refused wrongly. The facts tests catch that, since they require `guarded: null`.
