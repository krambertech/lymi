---
status: accepted
date: 2026-11-21
---

# Oxlint and oxfmt replace Biome

Oxlint lints the repository and oxfmt formats it, in place of Biome. `pnpm check` runs `oxfmt --check .` and `oxlint .`, and `pnpm fix` writes both. `.oxlintrc.json` and `.oxfmtrc.json` hold the configuration. Lymi's own rules live in `oxlint-plugin-lymi`, one JavaScript file and one test per rule.

## Context

Biome lints and formats in one tool, but its plugins are GritQL patterns over its own syntax tree, which keeps comments as trivia that no pattern can reach. So the rule in [CODING_STANDARDS.md](../../CODING_STANDARDS.md#write-no-comments) could not be a lint rule, and the 14 Grit plugins had no tests and used a language few contributors read.

Oxlint's JS plugins take ESLint's rule API, including `sourceCode.getAllComments()`, and run beside Oxlint's native Rust rules. oxfmt formats JavaScript, TypeScript, JSON and CSS with Prettier's rules. T3 Code and Kody run the same pair, and T3 keeps about 40 custom rules, a comment rule among them, in a JS plugin.

## Considered options

- **Oxlint and oxfmt:** accepted. One plugin API covers every custom rule, comments included, and each rule is tested by running the real linter on a fixture.
- **Keep Biome and add ESLint for the comment rule:** rejected. Two linters, two configs and two editor extensions, kept for one rule.
- **Keep Biome and enforce comments with a script:** rejected. It works, but the editor never shows the error, and every later rule that reads comments would need a script too.

## Consequences

- `oxlint .` takes about 3 seconds with Lymi's rules, where `biome check .` took about 17.
- `lymi/no-comments` reads `scripts/comment-baseline.json`, so an older file may keep its counted comments and a new one none. `pnpm check:comments` still fails when the baseline allows more than a file holds, and `--update` lowers it.
- The switch reformatted about 185 files once, nearly all of it import order: oxfmt sorts `vitest-browser-react` before `vitest/browser`, Biome the reverse. JSON keeps no trailing commas, as `wrangler.jsonc` had under Biome.
- Biome's CSS lint rules have no Oxlint equivalent, so CSS is formatted but not linted. `pnpm check:styling` still checks colours and directions there. Oxlint lints `<script>` blocks in `.astro` files, which Biome skipped, but not their frontmatter.
- Oxlint's versions of several rules find more than Biome's did. Where Biome had the rule, each existing finding carries a suppression naming [#1278](https://github.com/krambertech/lymi/issues/1278). Where Biome had none, the rule is off and listed there. Unused variables stay warnings, as they were in Biome.
- A `biome-ignore` covered a whole statement, but `oxlint-disable-next-line` covers one line, and a hook's dependency finding sits on its dependency array. Suppressions that span a hook use `oxlint-disable` and `oxlint-enable` around it.
- Oxlint's JS plugins are alpha and oxfmt is beta, so an upgrade can change a diagnostic or a format. The versions are pinned, and an upgrade is its own pull request.
- Editors need the Oxc extension in place of Biome's.
