# ADR 0012: Hold-out results are report-only in CI

- **Status:** Accepted
- **Date:** 2026-11-23
- **Decided by:** Rob Browning
- **Changes:** how ADR 0005's hold-out job affects the build

## Context

The round 2 hold-out run scored 10/12. Both misses (H09, H10) are correct answers worded differently from the keyword check: "Lights come with every hire" and "provided both of you book together". ADR 0005 forbids editing hold-out questions to make them pass, so they stay failing. The hold-out job also runs on every push to main, so main would stay red until the next round.

A hold-out set is a one-off measurement for a round of fixes. Once used, it is no longer unseen (ADR 0005). A red build on every push for a known, recorded result would train people to ignore red builds.

## Decision

- The hold-out step in CI runs with `continue-on-error`. A failure shows as a warning on the run, not a failed build.
- Every hold-out result is still recorded: the layer summary notice, the uploaded report, and the README's results section.
- The eval suite (`tests/eval/`) stays a hard gate.

## Consequences

- Main stays green while the round 2 hold-out result stays visible and honest.
- A hold-out regression won't block a merge on its own. Someone has to read the warning. The PR template and review prompt now ask for the hold-out result to be stated in the PR when it was run.
- Round 3 needs a fresh hold-out set, graded by the judge as well as keywords, so paraphrased correct answers aren't counted as misses.
