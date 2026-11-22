# ADR 0004: AI PR reviewer, reused from the twins

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The twin repos run a QA-tuned Claude reviewer on every PR (their ADR 0004 and 0005). On Cypress PR #10 it caught 4 of 4 seeded defects with no false positives. Eval code has its own ways to go wrong, and the most dangerous is quietly loosening a check until a wrong answer passes.

## Decision

- Copy the twins' `claude-review.yml` and `claude.yml` (`@claude`) unchanged, using the official `anthropics/claude-code-action@v1` and the `CLAUDE_CODE_OAUTH_TOKEN` secret.
- Rewrite `.github/claude-review-prompt.md` for this repo. Its Blockers are eval-specific: weakened facts or regexes, labels changed to match model output, lowered thresholds, unpinned models, retries on evals, and checks with no gate test.
- Comments only. The workflow token is read-only. Merges need CI green and human approval.

## Consequences

- All three showcases are reviewed the same way, so results compare across them.
- The reviewer reads code and data, not model behaviour. Whether the bot is right is the eval suite's job.
