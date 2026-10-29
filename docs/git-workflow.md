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

Commit or stash local changes first, and rebase rather than merge `main` into the branch. `--force-with-lease` protects remote work that appeared after the last fetch.

## Name commits and pull requests

Use Conventional Commits for meaningful branch commits and every pull request title:

```text
type(scope): imperative summary
```

Allowed types are `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, and `revert`. Use a concise lower-case scope such as `web`, `api`, `auth`, `review`, `audio`, `core`, `docs`, `repo`, or `deps`.

Aim for 60 characters and never exceed 72. Start the summary with a lower-case word, use the imperative mood, and omit the final period. Name the concrete outcome in literal language, without metaphors, promotion or issue numbers. Add `!` before the colon for a breaking change.

```text
feat(review): add keyboard grading
fix(auth): preserve deep links after sign-in
fix(audio): retry failed speech generation
docs(repo): explain local setup
feat(api)!: replace the card response shape
```

Fixup commits are fine on an open pull request, because GitHub squashes the branch. The pull request title becomes the commit subject on `main`, so it names one logical change.

## Write the pull request description

Start from [the pull request template](../.github/pull_request_template.md); do not compose a parallel shape from memory. Keep the summary to one short paragraph or at most three bullets and list only checks that ran and their result.

Every rendered UI change keeps the `Screenshots` section with an attached after image at minimum and before-and-after evidence when comparison helps, attached with `gh --attach` locally or `pnpm pr:media` in a cloud session ([guide](../.agents/skills/open-pr/references/screenshots.md)); attachment failure leaves the pull request blocked rather than review-ready.

Add `Why`, `Risks`, or `Follow-ups` only when material, with one short paragraph or at most three bullets per section. Describe reviewer-relevant behavior and trade-offs, not the implementation journey or a file inventory. Link to an owning decision instead of repeating it. Include raw output only when it explains a failure. Omit decorative emoji, generated-by footers, empty sections, and passing logs already visible in CI.

## Merge a pull request

Merge with **Squash and merge** after CI passes and review threads are resolved, and check that the generated commit title matches the pull request title. GitHub uses the pull request description as the commit body and deletes the branch after merging.

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
