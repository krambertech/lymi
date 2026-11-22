# Git workflow

`main` is Lymi's readable release record: one pull request becomes one squash commit. Work on short-lived branches, rebase them while the pull request is open, and merge them through GitHub after CI passes.

## Start and sync a branch

Use the `kateryna/` prefix and a short kebab-case description:

```bash
git fetch origin
git switch -c kateryna/review-keyboard-shortcuts origin/main
```

Bring an open branch up to date by rebasing it onto the remote `main`:

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease
```

Commit or stash local changes first, and rebase rather than merge `main` into the branch. `--force-with-lease` protects remote work that appeared after the last fetch. An Estonian lesson branch merges `main` in instead, as [the estonian-lesson skill](../.agents/skills/estonian-lesson/references/checklists.md#merge-conflicts) says: its catalogue and clip conflicts would recur at every commit of a rebase, and the squash merge keeps `main` linear either way.

## Name commits and pull requests

Use Conventional Commits for meaningful branch commits and every pull request title:

```text
type(scope): imperative summary
```

Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, and `revert`. Use a concise lower-case scope such as `web`, `api`, `auth`, `review`, `audio`, `core`, `docs`, `repo`, or `deps`.

Aim for 60 characters and never exceed 72. Start the summary with a lower-case word, use the imperative mood, and omit the final period. Name the concrete outcome in literal language, without metaphors, promotion or issue numbers. Prefer a specific verb and object over broad words such as "improve", "streamline" or "harden". Include quantities or performance gains only when measured evidence supports them. Revisit the title when scope changes. Add `!` before the colon for a breaking change.

```text
feat(review): add keyboard grading
fix(auth): preserve deep links after sign-in
fix(audio): retry failed speech generation
docs(repo): explain local setup
feat(api)!: replace the card response shape
```

Fixup commits are fine on an open pull request, because GitHub squashes the branch, but every pushed commit must be safe to merge: the pull request may merge as soon as its checks pass. Push a throwaway experiment to a `kateryna/do-not-merge-<name>` branch. The pull request title becomes the commit subject on `main`, so it names one logical change.

## Write the pull request description

Start from [the pull request template](../.github/pull_request_template.md). Open with the problem or missing capability from the request, then the resulting behavior and how you know. For repository work, name the developer or operational consequence. Link to an owning decision instead of repeating it. Leave out the story of the work, file inventories, passing checks CI already shows, empty sections, decorative emoji and generated-by footers. Include raw output only when it explains a failure.

**`scripts/check-pr-body.mjs` fails a description that breaks the template.** The Pull request workflow runs it, and runs it again when the description is edited, without running CI again. Run it first with `pnpm pr:check <body file> "<title>"`.

| When | The description has |
| --- | --- |
| Always | A Summary of at most 150 words and at most 600 words in all, not counting images, screenshot tables and fenced output. It names no audit skill from outside this repository. |
| The diff touches rendered UI | An image of each affected surface ([guide](../.agents/skills/open-pr/references/screenshots.md)) and a `Try it:` line with the preview path or screen, the persona and the steps; or a `No visible change:` line that says why. A failed attachment leaves the pull request blocked. |
| The diff changes behavior | A `Review:` line in Verification with the reviewer, the rounds and the verdict, or why none ran. |

A bot's pull request gets the same findings as warnings.

## Comment on a pull request

An inline review comment raises one actionable defect, its consequence and the smallest useful fix in two or three sentences. Put context that several comments share in one top-level comment. [The open-pr skill](../.agents/skills/open-pr/SKILL.md#leave-pr-comments) says which comments an agent may post without asking.

## Merge a pull request

Merge with **Squash and merge** after CI passes and review threads are resolved, and check that the generated commit title matches the pull request title. `main` has no required checks, so `gh pr merge --auto` merges at once: read `gh pr checks <number>`, then run `gh pr merge <number> --squash`. GitHub uses the pull request description as the commit body and deletes the branch after merging.

Opening a pull request does not authorize merging it, with one standing exception from Kateryna: the agent that opened an Estonian lesson pull request merges it once it is approved, green and has no open threads.

## Stack pull requests that depend on each other

Open one pull request on `main` by default. Stack only when a change needs the code of another open pull request, such as an editor built on a schema change still in review.

**Use GitHub's native stacks through the `gh stack` extension, never a pull request based on another branch by hand.** After a squash merge below it, a hand-made stack leaves the branch above carrying commits that are already on `main`; a native stack rebases it for you. Install the extension once:

```bash
gh extension install github/gh-stack
```

Start a stack from `origin/main`, commit each layer on its own branch, then push every branch and open the linked pull requests:

```bash
git fetch origin
gh stack init kateryna/card-schema
# commit the first layer
gh stack add kateryna/card-editor
# commit the second layer
gh stack submit
```

To build on a pull request that is already open, check out its branch and run `gh stack init <its-branch> <new-branch>`. Each layer is a full pull request: a Conventional Commit title, the template body, its own verification, and green CI. GitHub judges required checks and reviews against `main`.

Keep a stack current with `gh stack sync` instead of `git rebase origin/main`. It fetches, rebases every layer in order, and pushes with `--force-with-lease`. When a conflict stops it, every branch goes back to where it was; run `gh stack rebase`, resolve each layer, and continue with `gh stack rebase --continue`.

Merge from the bottom. Merging a layer on GitHub merges every layer beneath it in the same step, so merge the bottom layer alone while the layers above are still in review. GitHub then rebases the remaining layers onto `main`; run `gh stack sync --prune` to catch up locally and delete the merged branches.

Change a migration in the layer that adds it. CI takes a layer's base as already applied, so a later layer that edits a lower layer's migration can fail `pnpm check:migrations`.

## Branches from before the history migration

Move a branch based on the graph before 2026-09-06, when the repository adopted this linear history, to a fresh branch from `origin/main` with only its unique commits or net diff. An ordinary rebase of it may replay changes already on `main`. The recovery tag `archive/pre-linear-history-2026-09-06` retains the previous `main` history.
