---
name: local-dev
description: Run the Lymi product locally and put it in a chosen state. Use when a change needs to be seen in the browser, when a screen needs a signed-in session, seeded data, a specific persona, a theme, or a meaning language, or when local migrations fail.
---

# Local development

[docs/local-dev.md](../../../docs/local-dev.md) owns the personas, the developer panel, the `pnpm local` commands and the `/api/dev` routes. This is the order of operations.

## Start

Use the Browser pane's `preview_start` with the launch configuration named `lymi`. It prefers port 5241 and takes a free port when another worktree holds it; use the port `preview_start` reports. Do not start it through Bash.

If the server logs a migration error, or `pnpm db:migrate` reports a table that already exists, run `pnpm local db:fresh` and start the server again.

## Sign in

Navigate the tab to `/api/dev/sign-in?as=<persona>` on that port. The response sets the session cookie and redirects to Today. Never type a password, and never hand a password to the user to type; the persona accounts need none.

Pick the persona from the table in [Become a persona](../../../docs/local-dev.md#become-a-persona), or run `pnpm local personas`. Add `returnTo=/library` to land on another screen and `reset=1` to reseed.

## Change the state

Prefer `pnpm local` from a terminal: it needs no clicks and its output is text you can check. `pnpm local --help` lists the commands.

Use the developer panel when the state is one only its Simulate actions reach. Press the backtick key to open it; [Change the state from the panel](../../../docs/local-dev.md#change-the-state-from-the-panel) describes each control.

## Verify

After any change, read the console and the network log before a screenshot. Seeding is deterministic: the same persona gives the same decks, cards and grades every time, so a count that differs from `docs/local-dev.md` is a bug, not noise.
