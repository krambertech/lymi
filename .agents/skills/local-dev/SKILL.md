---
name: local-dev
description: Run the Lymi product locally and put it in a chosen state. Use when a change needs to be seen in the browser, when a screen needs a signed-in session, seeded data, a specific persona, a theme, or a meaning language, or when local migrations fail.
---

# Local development

[docs/local-dev.md](../../../docs/local-dev.md) owns the personas, the developer palette, the `pnpm local` commands and the `/api/dev` routes. This is the order of operations.

## Start

Start the server with the Browser pane's `preview_start` and the `lymi` launch configuration, never through Bash. It prefers port 5241 and takes a free port when another worktree holds it; use the port `preview_start` reports.

If the server logs a migration error, or `pnpm db:migrate` reports a table that already exists, run `pnpm local db:fresh` and start the server again.

## Sign in

Navigate the tab to `/api/dev/sign-in?as=<persona>` on that port. The response sets the session cookie and redirects to Today. The persona accounts have no password, so never type one or ask the user to.

Pick the persona from the table in [Become a persona](../../../docs/local-dev.md#become-a-persona), or run `pnpm local personas`. Add `returnTo=/library` to land on another screen and `reset=1` to reseed.

## Change the state

Change the state with `pnpm local` from a terminal: it needs no clicks and its output is text you can check. `pnpm local --help` lists the commands.

Use the developer palette when the state is one only its Simulate commands reach. Press the backtick key to open it, or run the same command with `pnpm local <command>`; [Change the state from the palette](../../../docs/local-dev.md#change-the-state-from-the-palette) describes each one.

## Verify

After any change, read the console and the network log before a screenshot. Seeding is deterministic: the same persona gives the same decks, cards and grades every time, so a count that differs from `docs/local-dev.md` is a bug, not noise.

To prove a feature works rather than look at it, use the [verify skill](../verify/SKILL.md): it drives the feature map's recipes against this server, checks the stored state, and keeps the evidence. For the phone app, use [verify-phone](../verify-phone/SKILL.md).
