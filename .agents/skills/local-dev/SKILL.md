---
name: local-dev
description: Run the Lymi product locally and put it in a chosen state. Use when a change needs to be seen in the browser, when a screen needs a signed-in session, seeded data, a specific persona, a theme, or a meaning language, or when local migrations fail.
---

# Local development

Full detail is in [docs/local-dev.md](../../../docs/local-dev.md). This is the order of operations.

## Start

Use the Browser pane's `preview_start` with the launch configuration named `lymi`. It serves the product on port 5241, which is the `PRODUCT_URL` in `apps/web/.dev.vars`. Do not start it through Bash.

If the server logs a migration error, or `pnpm db:migrate` reports a table that already exists, run `pnpm local db:fresh` and start the server again.

## Sign in

Navigate the tab to `http://localhost:5241/api/dev/sign-in?as=<persona>`. The response sets the session cookie and redirects to Today. Never type a password, and never hand a password to the user to type; the persona accounts need none.

Personas: `fresh` (nothing), `learner` (three decks, a few due, a streak, cards from an assistant), `streak` (fourteen days, nothing due), `backlog` (everything due), `polyglot` (Ukrainian meanings, a deck with no language). `pnpm local personas` prints them.

Add `returnTo=/library` to land on another screen. Add `reset=1` to reseed.

## Change the state

From a terminal, `pnpm local` does everything without a browser:

```bash
pnpm local state --as learner
pnpm local due 5 --as learner
pnpm local seed backlog --as learner --reset
pnpm local reset --as fresh
```

From the browser, press the backtick key or the round button in the bottom-right corner to open the developer panel. It is five rows: persona, due count, data, meaning language, theme. The first four are the app's Combobox: click the row's box, type to filter, press Enter (the key named `Enter`, not `Return`). Theme is three segments. The closed box shows the current value, so `find "Persona"` or a screenshot answers "which persona am I".

## Verify

After any change, read the console and the network log before a screenshot. Seeding is deterministic: the same persona gives the same decks, cards and grades every time, so a count that differs from `docs/local-dev.md` is a bug, not noise.
