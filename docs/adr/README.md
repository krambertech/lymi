# Architecture decision records

One file per decision that is hard to reverse, surprising without context, and the result of a real trade-off. Everything else lives in [stack.md](../stack.md). Vocabulary lives in [CONTEXT.md](../../CONTEXT.md).

## Writing an ADR

Use an ADR for one consequential decision that is accepted or ready for explicit approval. `proposed` means approval is pending; open-ended exploration belongs in [`docs/proposals`](../proposals/README.md).

- Title the ADR as the decision, not the topic.
- Include `status` and `date` in frontmatter; add `supersedes` only when applicable.
- State the decision in the opening paragraph. Keep `Context` to the facts and constraints that made a decision necessary.
- List only real alternatives under `Considered options`, with one short reason each was accepted, rejected, or deferred.
- Record material benefits, costs, constraints, and required follow-ups under `Consequences`; do not turn them into an implementation sequence.
- Link research and the implementation plan instead of copying them. Omit chronology, tutorials, code walkthroughs, and repeated rationale.

Aim for 300–700 words. Exceed that only when compression would hide a material security, data, migration, or operational consequence.

| ADR | Decision |
| --- | --- |
| [0001](0001-integration-cards-are-ordinary-cards.md) | Cards added by integrations are ordinary cards, overseen in Activity |
| [0002](0002-mcp-client-extracts-server-enriches.md) | The MCP client extracts vocabulary, the server only enriches |
| [0003](0003-better-auth-is-the-oauth-server.md) | Better Auth is the OAuth server for MCP and issues API keys |
| [0004](0004-duplicates-are-skipped-not-rejected.md) | A duplicate is the same term and language anywhere, and adding one is skipped |
| [0005](0005-review-is-a-button-not-a-destination.md) | Review is a button, not a destination, and rarely-opened screens live behind You |
| [0006](0006-web-push-reminders-are-per-device.md) | Review reminders use direct Web Push and are enabled per device |
| [0007](0007-a-decks-direction-is-a-filter-not-a-migration.md) | A deck's direction filters card states rather than migrating them |
| [0008](0008-public-website-and-product-use-separate-origins.md) | The public website and product use separate origins |
| [0009](0009-public-website-and-product-deploy-separately.md) | The public website and product deploy separately |
| [0010](0010-the-review-queue-is-ordered-by-retrievability.md) | The review queue is ordered by retrievability, not by due date |
| [0011](0011-a-shared-deck-is-one-deck-with-many-learners.md) | A shared deck is one deck with many learners, and its invitation is the front door |
| [0012](0012-interface-text-is-english-source-translated-by-lingui.md) | Interface text is English source in the code, translated through Lingui catalogs |
| [0013](0013-app-language-is-one-setting-that-meaning-language-follows.md) | App language is one stored setting, and meaning language follows it |
| [0014](0014-review-modes-use-explicit-cues-and-targets.md) | Review modes use explicit cues and targets |
| [0015](0015-published-decks-use-pinned-localized-editions.md) | Published decks use pinned localized editions and learner-controlled updates |
| [0016](0016-public-catalog-pages-render-on-the-public-worker.md) | Public catalog pages render on the public Worker |
