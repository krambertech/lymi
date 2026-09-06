# PR body template

The section markup lives in [`.github/pull_request_template.md`](../../../../.github/pull_request_template.md). That file is the one source of truth for headings and their order — GitHub prefills it. This file carries only the rules for how to fill it.

## Budget

The body is short by design. The bar: a reviewer reads all of it in under 30 seconds, about 100 words of prose. Code blocks, the Mermaid diagram, and the screenshot table sit outside the word budget.

## Menu, not form

Include a section only when it applies and omit the rest entirely, heading and all. Never ship an empty section, an "N/A", or a template guidance comment — strip every `<!-- -->` from the final body.

- **Always:** `✨ What`, `✅ How to verify`.
- **`🤔 Why`** only when the reason needs its own sentences (a decision recorded in `docs/stack.md`, a constraint, a bug worth describing). When the why fits in one clause, fold it into the What sentence and drop the heading.
- **Only when relevant:** `🏗️ Architecture` (a boundary moved, with a Mermaid diagram), `📸 Screenshots` (the learner sees something different), `📝 Notes` (a trade-off, a deferred follow-up, or "PR 3 of 5"; most PRs have none).

## Line breaks

Write each paragraph and each bullet as one long line. GitHub renders every newline in the source as a visible break, so text wrapped at 80 columns stays in an 80-column ribbon. Press Enter only between paragraphs, between list items, and around headings and fenced blocks.

## Filling the sections

- **✨ What** — one or two sentences. Lead with what the learner can now do, and fold the reason in when it fits ("…, so a card graded on the train is not lost"). State what changed, never a walk through the diff. Use the words from `CONTEXT.md`.
- **🤔 Why** — one or two sentences, only when the reason outgrows a clause.
- **🏗️ Architecture** — a small Mermaid diagram, real names, real arrow directions.
- **✅ How to verify** — two or three bullets, the fastest path for a reviewer to convince themselves it works (`pnpm dev`, visit route, do X, expect Y — or the test that covers it). A schema change says here whether `pnpm db:migrate:prod` has to run on merge. Wrap test output longer than ~10 lines in `<details><summary>Test output</summary>…</details>`.
- **📸 Screenshots** — a table with phone and desktop columns, before and after rows, filled with uploaded-image markdown after the PR opens.
- **📝 Notes** — one or two lines, rarely.

## Voice

Plain and direct, written for a tired reviewer at 5pm. No hype ("massively improves", "huge win"), no apology. Cut any sentence that restates the diff or repeats another section. Follow the writing guidance in [`AGENTS.md`](../../../../AGENTS.md).
