---
name: open-pr
description: |
  Use when the user asks to open / create / raise a PR, "push this up for review", or finishes a change and wants it reviewed.
allowed-tools:
  - AskUserQuestion
  - Bash
  - Read
  - Glob
  - Grep
  - Skill
  - SendUserFile
---

# open-pr

Open one consistently shaped pull request for the current branch, then watch it through review. Opening the PR is the midpoint of this skill, not the end: a PR opened here is a PR being babysat.

Hard limits: never push to `main`, never merge, never deploy. Merging and `pnpm deploy` are the user's call.

## Step 1 — confirm there is something to PR

```bash
git rev-parse --abbrev-ref HEAD     # current branch
git status --short                  # uncommitted work?
git log --oneline main..HEAD        # commits ahead of main
```

- On `main`: stop and offer to create a branch first (`claude/<short-slug>`).
- Uncommitted changes: surface them and ask whether to commit them now (small reviewable commits) or leave them out. Changes left out get set aside before the checks and screenshots, so both reflect only the PR content; restore them after opening. In a worktree, use a temporary WIP commit rather than `git stash` — the stash stack is shared with every other worktree.
- Zero commits ahead of `main`: nothing to PR. Say so and stop.

## Step 2 — go green before opening

```bash
pnpm check && pnpm typecheck && pnpm test
```

CI runs the same three on the pull request, so anything red here is red there ten minutes later. Run all three and fix a failure before opening, and show the error verbatim. A reviewer who has to discover a type error you could have seen is a reviewer whose attention you wasted.

## Step 3 — self-review and classify scope

A light pass over your own diff, not an adversarial review (that is `/code-review`'s job). Follow [`references/self-review.md`](references/self-review.md): check for scope creep, leftovers, and violations of the conventions in [`AGENTS.md`](../../../AGENTS.md); decide whether the change needs a Mermaid diagram. Show the user the short self-review summary before opening.

## Step 4 — derive the title

`type(scope): summary`. Scope comes from the changed paths (`git diff --name-only main..HEAD`):

- `apps/web/src/client/**` → `web`
- `apps/web/src/server/**` → `api`, or `mcp` for `server/mcp/**`
- `packages/core/**` → `core`
- `apps/web/migrations/**`, schema changes → `db`
- `DESIGN.md`, `design/**`, tokens → `design`
- `docs/**`, `README.md`, `PRODUCT.md`, `CONTEXT.md` → `docs`
- Genuinely cross-cutting → drop the scope.

Type: `feat` (new capability the learner can use), `fix`, `refactor` (no behavior change), `perf`, `docs`, `chore` (deps/config/tooling), `test`. Summary: lower-case, imperative, no trailing period, under ~70 chars total.

> `feat(web): grade a card with the number keys`
> `fix(api): keep a duplicate term from blocking the rest of the batch`

## Step 5 — screenshots for UI changes

If the diff touches anything the learner sees (`apps/web/src/client/**`, `*.tsx`, `styles.css`, user-facing copy), screenshots are mandatory. Lymi is a phone-first PWA, so a desktop-only shot is half the story — capture both viewports, in both themes when the change touches color. Follow [`references/screenshots.md`](references/screenshots.md); embedding happens in Step 7, after the PR exists. Never silently skip screenshots on a visual change.

Server, config, and docs changes skip this step.

## Step 6 — write the body and open

Assemble the body from [`references/pr-body-template.md`](references/pr-body-template.md). The bar: a reviewer reads the whole body in under 30 seconds, about 100 words of prose. Write each paragraph and each bullet as one long line; GitHub turns every newline into a visible break. Write the body to a temp file (never inline newlines into `--body`):

```bash
gh pr create --base main --title "feat(web): …" --body-file /tmp/pr-body.md
```

Report the PR URL back as a clickable link.

## Step 7 — embed the screenshots (UI changes only)

Upload the captured PNGs to GitHub's own storage via the user-attachments endpoint, fold the resulting markdown into the body's `## 📸 Screenshots` table with `gh pr edit`, and verify the images render. The attach ladder and the last-resort hand-off: [`references/screenshots.md`](references/screenshots.md).

## Step 8 — babysit

Start watching as soon as the PR is open. Tell the user in one line that you are watching it; asking permission is a step backwards, the watch is included. Follow [`references/babysit.md`](references/babysit.md). Stop when the PR merges or closes, or when the user says stop.
