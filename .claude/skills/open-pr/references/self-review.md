# Self-review before opening

A light pass over your own diff with fresh eyes, not an adversarial review. Catch the obvious-in-hindsight before the reviewer spends attention on it.

```bash
git diff main..HEAD
git diff --name-only main..HEAD
```

## The pass

One line per item that trips, proportionate to the change — a copy tweak needs no essay, a new table does:

- **Scope creep.** Every changed file belongs to this PR's stated purpose. Call out unrelated edits riding along, or split them out.
- **Altitude.** Something both the client and the server need lives in `packages/core`, not copied on each side. A one-off helper stays where it is used.
- **Leftovers.** Debug output, `console.log`, commented-out blocks, introduced `TODO`/`FIXME`, dead code, a renamed-but-unused export.
- **Domain words.** Names in code, copy, and API fields match [`CONTEXT.md`](../../../../CONTEXT.md). "Delete" where it means archive, "flashcard" where it means card, "suggest" where the AI enriches — each is a real bug in a repo whose whole point is one consistent vocabulary.
- **Conventions** from [`AGENTS.md`](../../../../AGENTS.md). Flag violations, never fix them silently:
  - Tailwind utilities over Lymi tokens; no raw hex, no stock Tailwind color.
  - Zod schema in `packages/core` is the source of truth for a payload; the type is inferred from it.
  - Routes parse and return, services hold logic and own the database.
  - Every write goes through `audit.ts` with an actor.
  - Generated files (`routeTree.gen.ts`, `migrations/**`, `schema/auth.ts`) are regenerated, never hand-edited.
- **Tests.** A behavior change in `packages/core` has a test, or a stated reason it doesn't. Scheduling and term-normalisation changes always get one — they are where a silent regression costs the learner their history.
- **Migrations.** A schema change ships with the generated SQL in the same PR, and the PR body says whether `pnpm db:migrate:prod` has to run on merge.

## Mermaid diagram, only for moved boundaries

Include a small Mermaid diagram in the body only when the structure is different now: a new data flow, a new module boundary, a schema reshape, a new surface on the Worker. A before→after pair when reshaping existing structure. Keep it minimal — a handful of nodes, real names, real arrow directions. `docs/stack.md` already draws the whole system; the diagram in a PR shows only what moved.

````markdown
```mermaid
flowchart LR
  Review[review route] --> Outbox[(IndexedDB outbox)]
  Outbox -- replay on reconnect --> API[/api/review]
```
````

A bug fix, a copy tweak, or a refactor that moves no boundary gets no diagram.

## Output

Show this summary in chat before opening the PR:

```text
Self-review:
- Scope: apps/web/src/client/routes/review.tsx + packages/core/src/fsrs.ts
- Conventions: fits; no scope creep or leftovers spotted
- Notes: <anything worth a second look, or "nothing notable">
```
