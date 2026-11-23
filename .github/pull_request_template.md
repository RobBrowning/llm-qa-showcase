## What and why

<!-- One or two sentences: what this PR changes and the reason for it. -->

**Acceptance criteria**
<!-- Numbered, testable. The Claude QA review checks each one has a test. -->
- AC1:

## Manual check replaced

<!-- New tests must name the manual check they replace. If none, add it to the "not automated" table in docs/test-strategy.md instead. -->

## Checklist

- [ ] `npm run typecheck` and `npm run check:unit` pass
- [ ] `npm run test:ui` passes; eval changes run with `npm run test:eval` (or the `eval-full` CI job)
- [ ] Expected facts and labels come from `kb/`, never from model output
- [ ] No threshold lowered, fact removed or regex loosened without a new ADR
- [ ] Model ids and revisions pinned
- [ ] New classifier or judge checks have a gate test that proves they can fail
- [ ] If the hold-out set was run, its result is stated above (ADR 0012)
- [ ] Seeded defects stay behind `DEFECT`; new ones are listed in `docs/test-strategy.md`
- [ ] Locators use `getByTestId` or `getByRole`: no CSS chains, no XPath
- [ ] No `waitForTimeout`, no `test.only`, no unexplained `test.skip` or `test.fixme`
- [ ] Structural decisions recorded as a new ADR in `docs/adr/`
- [ ] No `.env`, reports, `results/` or `test-results/` committed
- [ ] No em dashes or en dashes in any file
