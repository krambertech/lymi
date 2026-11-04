# Coding standards

These rules apply to every app and package; a rule for one app lives in its `AGENTS.md`.

## Put code where it is shared

`packages/core` holds shared schema, validation and scheduling; `packages/client` holds API calls, queries, outboxes and the review draw; `packages/design` holds tokens, brand geometry and motion. Each client configures the shared client with its origin, session headers and storage. Language behavior belongs in `packages/core/src/languages`, the one place that compares language codes.

TanStack Query owns reads and caches. Shared API, query and response modules have one file per resource behind a barrel: add a card method to `packages/client/src/api/cards.ts`, not to the barrel.

## Take types from the schema

API payloads come from the Zod schemas in `packages/core/src/types.ts`; parse with the schema and infer its type. Use `interface Props` for React props and `type` for unions and small shapes.

## Localize whole sentences

English is the source message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module constants, and `<Plural>` or `plural` for counts.

Localize each complete sentence. Never build one from concatenated fragments or a ternary on `=== 1`, because Ukrainian and Russian need their own word order and three plural forms.

Format dates and numbers with `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`, so they follow the interface language. Run `pnpm i18n:extract` after changing a message.

## Edit the source of a generated file

Edit a generated file's source and run its generator; [README.md](README.md#generated-files) names each generator. Applied migrations are immutable: change the schema and run `pnpm db:generate` for a new one.

## Write for D1 and Workers, not Node

D1's `lower()` folds ASCII only. To case-fold in server SQL or a new migration, fold in JavaScript with `toLocaleLowerCase()` and bind the result, or store a normalized column.

Workers refuses `redirect: "error"` at runtime, though Node tests pass; reject a redirect with `redirect: "manual"` and a `Location` check.

## Comment only what the code cannot say

A source comment states a reason, invariant, safety boundary or platform quirk the code cannot express, in one sentence. Longer rationale belongs in its owning doc or ADR. Reserve JSDoc for public contracts whose behavior names and types cannot express.
