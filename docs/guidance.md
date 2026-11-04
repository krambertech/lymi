# Write and maintain guidance

This covers the repository's own documents: the root and nested `AGENTS.md`, skills, `docs/`, proposals and ADRs. Source comments follow [the shared conventions](../AGENTS.md#shared-code-and-conventions).

## Put each fact where it is owned

Keep each fact in one place, and update that place when the fact changes.

| Fact | Lives in |
| --- | --- |
| Durable behavior and operating instructions | The owning document; [PRODUCT.md](../PRODUCT.md#features) names it for each feature |
| Session history and check results | The pull request |
| Brand rationale | [docs/design/system/brand.md](design/system/brand.md) |
| Active work | GitHub issues |
| A direction still under discussion | [A proposal](proposals/README.md) |

## Write it once, in literal language

State outcomes, constraints, reasons and evidence once, using literal language. Link to the owning source rather than restating it.

Write each paragraph and list item on one source line, and let the editor wrap it. Keep the Markdown structure of headings, lists and tables intact.

`pnpm check:agent-docs` checks guide sizes and the paths, commands and skills that guides name. A new document that agents follow belongs in the `references` list of `agentDocs()` in `scripts/check-agent-docs.mjs`, so its links and commands are checked too.

## Report friction

The friction log is the repository's Developer experience discussions. Report a recurring repository gotcha there without asking first. Search first with `pnpm friction search <words>`, then use `pnpm friction plus <number> --note …` for a match or `pnpm friction file` for a new report, answering [the form](../.github/DISCUSSION_TEMPLATE/developer-experience.yml). A second occurrence goes through GitHub's "Create issue from discussion" to become a check, hook or guide rule.
