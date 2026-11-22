# Coding standards

These rules apply to every app and package; a rule for one app lives in that app's guide.

## Put code where it is shared

`packages/core` holds shared schema, validation and scheduling; `packages/client` holds API calls, queries, outboxes and the review draw; `packages/design` holds tokens, brand geometry and motion. Each client configures the shared client with its origin, session headers and storage. Language behavior belongs in `packages/core/src/languages`, the one place that compares language codes.

TanStack Query owns reads and caches. Shared API, query and response modules have one file per resource behind a barrel: add a card method to `packages/client/src/api/cards.ts`, not to the barrel.

## Take types from the schema

API payloads come from the Zod schemas in `packages/core/src/types.ts`; parse with the schema and infer its type. Use `interface Props` for React props and `type` for unions and small shapes.

## Give a flow one state

A flow with steps or phases holds one value: a union tagged by `status` or `kind`, whose members carry only the fields that state has. Its moves live in one pure reducer with a declared return type and no `default`, so a new state or event fails to compile until the reducer handles it; an event the current state does not allow returns the state unchanged. Unit-test the reducer and keep the hook or store to wiring effects. `packages/client/src/review-flow` and `uploadReducer` in `packages/client/src/imports.ts` are the models.

Async work that something newer can replace checks that it still owns the state before it writes. On the server, an update that moves a status names the status it leaves in its `WHERE`.

## Localize whole sentences

English is the source message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module constants, and `<Plural>` or `plural` for counts.

Localize each complete sentence. Never build one from concatenated fragments or a ternary on `=== 1`, because Ukrainian and Russian need their own word order and three plural forms.

Format dates and numbers with `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`, so they follow the interface language. Run `pnpm i18n:extract` after changing a message.

## Edit the source of a generated file

Edit a generated file's source and run its generator; [README.md](README.md#generated-files) names each generator. Applied migrations are immutable: change the schema and run `pnpm db:generate` for a new one.

## Write for D1 and Workers, not Node

D1's `lower()` folds ASCII only. To match text case-insensitively, compare against the stored folded column (`termKey()` writes `normalized_term` and `tagKey()` writes `normalized_name`, both in `packages/core/src/terms.ts`), or fold in JavaScript with the same function and bind the result.

D1 refuses more than 100 bound parameters in one statement. `inArray` and `notInArray` from `@lymi/core/db` bind a list of more than five values as one JSON parameter, and lint refuses Drizzle's own; a multi-row insert still binds every value.

Workers refuses `redirect: "error"` at runtime, though Node tests pass; reject a redirect with `redirect: "manual"` and a `Location` check.

## Write no comments

Source files carry no comments. Say a reason in a name, a type, a test or a check; record a non-obvious decision or an outside constraint in the owning doc or an ADR, and link the code from there. Tool directives stay: `oxlint-disable-next-line` with its reason after `--`, `@ts-expect-error`, `/// <reference>`, `/** @type {…} */` in JavaScript, and the `check-styling: allow` marker.

The Oxlint rule `lymi/no-comments` enforces this for TypeScript and JavaScript, in the editor and in `pnpm check`. Older files still hold comments: [scripts/comment-baseline.json](scripts/comment-baseline.json) records how many comment lines each may keep, a new file may keep none, and a count may only fall. `pnpm check:comments` fails when the baseline allows more than a file holds; after deleting comments, lower it with `pnpm check:comments --update`. [The delete-comment skill](.agents/skills/delete-comment/SKILL.md) works through the rest.

