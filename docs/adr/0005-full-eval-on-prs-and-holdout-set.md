# ADR 0005: Full eval on every PR, and a hold-out set

- **Status:** Accepted
- **Date:** 2026-11-22
- **Changes:** the CI split in ADR 0001

## Context

The first full eval on main (22 Nov) found 8 failures in the bot. Fixing them means many small changes, each measured on its own. ADR 0001 ran only a `@smoke` subset on PRs, which would hide most of the effect of each change. The first run also showed the full eval takes about 3.5 minutes once models are cached, far less than expected.

Tuning a bot until a fixed question set passes risks "teaching to the test": the bot gets better at those questions, not at the job.

## Decision

- **Every PR runs the full eval**, not just `@smoke`. Models are cached by a key built from both model config files.
- **Hold-out set.** `data/holdout.json` holds 12 fresh questions, written before any round 2 fix and never used while tuning. They run in a separate Playwright project, `holdout`, on pushes to main and on PRs labelled `run-holdout`. A hold-out failure is fixed by improving the bot and then adding new hold-out questions, never by editing the failed one.
- **Headline numbers in the run summary.** A small reporter prints each layer's score, and the safety and judge tests print their metrics, as GitHub notices.
- GitHub Actions move to their Node 24 releases (checkout v6, setup-node v6, cache v5, upload-artifact v6).

## Consequences

- Each round 2 commit shows its effect on every layer, in the PR's run history.
- `@smoke` still exists for a quick local check (`npm run test:smoke`).
- The hold-out result is the evidence that fixes generalise. Once it has been used to judge a round of fixes, it is no longer unseen: the next round gets a new hold-out set.
