---
status: accepted
date: 2026-09-12
---

# Interface text is English source in the code, translated through Lingui catalogs

The English sentence in a component is the message. Lingui macros (`<Trans>`, `t`, `plural`, `msg`) mark it, `lingui extract` writes it into one `.po` catalog per locale, and untranslated messages fall back to English. Nobody invents a key. Adding a string is one edit in one file, and `pnpm i18n:check` inside `pnpm verify` fails when a string was added without extracting or, once a locale is live, left untranslated.

The agent working on a pull request drafts the Ukrainian and Russian from a `translate` skill that reads `CONTEXT.md` and `DESIGN.md`. The pull request diff is the review. There is no translation service and no API key for translation.

## Considered options

- Keyed catalogs (i18next, Paraglide). Rejected: every string needs a name, and every change touches the component and the catalog. For one maintainer that doubles the cost of the most frequent edit in the codebase.
- Hand-rolled typed message objects per locale. Rejected: TypeScript enforces completeness, but plurals, dates and interpolation get reinvented, and the source text still moves out of the component.
- A hosted translation editor (Crowdin, Tolgee, inlang). Rejected for now: a third service to keep in sync for two locales the maintainer reads herself.
- A script that calls a model to fill the catalogs. Rejected: it needs its own prompt and a key, while the agent on the PR already has the glossary and the voice docs.

## Consequences

- Both apps carry `@lingui/babel-plugin-lingui-macro` through `@vitejs/plugin-react` and `@lingui/vite-plugin`. Two Lingui configs, one per app, with separate catalogs.
- `.po` files live in git. `lineNumbers` and `origins` are off, so moving a string between files does not churn the diff or conflict with another branch.
- The product Worker uses `@lingui/core` with the same catalogs for push copy. Everything else server-side stays English, because the API's other callers are scripts and MCP clients.
- Biome cannot flag a hardcoded string. Review has to.
