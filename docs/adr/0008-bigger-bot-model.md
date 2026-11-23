# ADR 0008: Bot moves from Qwen2.5 0.5B to 1.5B

- **Status:** Accepted
- **Date:** 2026-11-22
- **Changes:** the bot model in ADR 0002

## Context

After round 2 fixes 1 and 2 (clearer `kb/` layout, price grounding check), the 0.5B bot still failed on rewordings with the right paragraph in front of it:

- "What's the full day price for an electric bike?" got £20.00, the city bike's price. It didn't connect "electric bike" with "E-bike".
- "Can a 17 year old ride one of your e-bikes?" got "Yes", next to the line "Nobody under 18 can ride an e-bike."

Retrieval was right in both cases, so the reading is at fault, not the search.

## Decision

Use `onnx-community/Qwen2.5-1.5B-Instruct` (q4), pinned to revision `d54957e3af1be04546436e874a60fe386041b244`. Same family and prompt, so the only variable is model size.

## Consequences

- Slower replies and a larger download, on CPU in CI.
- The judge (SmolLM2) is still a different family, so ADR 0002's independence rule holds.
- The earlier 0.5B results stay in the PR history as the "before" numbers.
