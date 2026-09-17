# Local development

How to run the product on this machine and put it into any state worth looking at, whether you are a person at the keyboard or an agent driving a browser. Everything here exists only while `PRODUCT_URL` is a loopback address; production answers 404 to all of it.

## Start the server

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # Google values can stay empty
pnpm db:migrate
pnpm --filter @lymi/web dev --port 5241
```

`pnpm dev` runs the product and the public website together. The product alone is enough for most work, and the `.claude/launch.json` entry named `lymi` starts it on port 5241, or on a free port when another worktree already holds 5241. A loopback `PRODUCT_URL` follows whichever port the request arrived on, so `.dev.vars` needs no per-worktree edit. Browsers share cookies across ports, so a loopback server prefixes its cookies with its port (`lymi-5241.session_token`) and parallel worktrees keep separate sessions.

If `pnpm db:migrate` fails with "table already exists" or a migration name it has never seen, the local D1 was built from another branch. `pnpm local db:fresh` moves it aside and applies every migration again. Nothing in that directory is production data.

## Become a persona

Open this URL in a browser and you are signed in and on Today:

```text
http://localhost:5241/api/dev/sign-in?as=learner
```

No password is typed anywhere. The server creates the account on first use, seeds it if it is empty, sets the session cookie, and redirects. Add `returnTo=/library` to land elsewhere, `reset=1` to reseed an account that already has data, or `seed=0` to sign in and leave the data as it is.

| Persona | Account | Starts with |
| --- | --- | --- |
| `fresh` | Fresh | Nothing. The first-run screens. |
| `learner` | Kateryna | Three weeks in: three decks, 43 cards, 9 due, a 4-day streak, three cards an assistant added today, one archived deck and one archived card. |
| `streak` | Sanna | Fourteen days running and nothing due. The flame is lit, small and still. |
| `backlog` | Marco | A month away: four decks, 60 cards, all due. |
| `long` | Ingrid | Six German cards asked both ways, all due: a sentence as the term, a dictionary-length meaning, and a card with every field at its limit. |
| `polyglot` | Оксана | Ukrainian interface and meanings. Italian, Finnish, and a deck with no language. |
| `publisher` | Lymi | The publisher account: one Estonian deck in three sections, published as `everyday-estonian` with an English original and a signed-off Ukrainian edition. |

The accounts are `<id>@lymi.local`. They pass the invitation allowlist only on a loopback origin, so `.dev.vars` needs no entry for them, and they are created already confirmed so no confirmation email stands between the URL and the app. `pnpm local personas` prints the same table from the running server.

To see a deck's join page, turn on its join link in deck settings and open the link signed out, or signed in as another persona with `/api/dev/sign-in?as=streak&returnTo=/join/<token>`. Adding `?dev=1` to a join link offers the local email sign-in, which carries the link through sign-in like Google does, so an address on no allowlist can join.

To see a published deck's public page, seed the `publisher` persona, then build the site and serve it from `apps/site` with `pnpm exec wrangler dev --persist-to ../web/.wrangler/state` to read the product's local D1, and open `/explore` for the catalogue or `/explore/everyday-estonian` for one deck. `/uk/explore/everyday-estonian` is the same deck's Ukrainian edition: the same Estonian terms in the same order, with Ukrainian meanings, section names, title and summary. `/ru/explore/everyday-estonian` has no edition, so it falls back to the English original. Adding from either page pins that edition on the membership, which is what a second persona sees in Library and in review. The add link follows `PUBLIC_PRODUCT_URL` at build time. Two local runtimes writing to one D1 can crash on `SQLITE_BUSY` ([workers-sdk#14916](https://github.com/cloudflare/workers-sdk/issues/14916)), so stop the site server before heavy product writes such as an import.

To publish a deck of your own instead, add `PUBLISHER_EMAILS=learner@lymi.local` to `apps/web/.dev.vars` and call `PUT /api/decks/<id>/publication`. Another edition takes three calls: `PUT /api/decks/<id>/editions/uk` writes its text, `POST /api/decks/<id>/editions/uk/approval` signs it off, and `PUT /api/decks/<id>/editions/uk/publication` puts it on the page. `GET /api/decks/<id>/editions` says what is still missing or stale.

A real account signed in locally through Google works with every tool below too; it just has no persona of its own, so seeding it loads `learner` unless another persona is named.

## Change the state from the panel

The round button in the bottom-right corner of every product screen opens the developer panel above it. The backtick key toggles it too. It is five rows showing the current value; the first three are searchable lists, the last two are segmented controls:

- **Persona**: who you are. Choosing another signs you in as that account and reloads the screen you were on.
- **Due**: how many cards are due now. Choose a number, or every card.
- **Data**: what the account holds. Reseed it, empty it, or load another persona's data into it.
- **Language**: the interface language, which the meaning language follows.
- **Theme**: system, light or dark.

Each change refreshes the queries behind the screen, so Today, Library and Insights update without a reload. The last thing that happened is written at the bottom. The panel is compiled into the Vite dev server only; a production build has no trace of it.

## Change the state from a terminal

`pnpm local` talks to the running server. Every command signs in as a persona first, so nothing has to be pasted from a browser.

```bash
pnpm local personas               # what each persona starts with
pnpm local url streak /insights   # the sign-in URL for a persona and a screen
pnpm local open backlog           # the same, opened in the default browser
pnpm local state --as learner     # who is signed in and what the account holds
pnpm local seed --as fresh        # load the account's own persona data
pnpm local seed polyglot --as learner --reset   # any persona's data into any account
pnpm local reset --as learner     # empty the account
pnpm local due 5 --as learner     # exactly five cards due now
pnpm local due all --as streak
pnpm local db:fresh               # rebuild the local D1 from the migrations
```

`--as` defaults to `LYMI_PERSONA`, then `learner`. `--url` defaults to `LYMI_URL`, then `PRODUCT_URL` in `apps/web/.dev.vars`, then `http://localhost:5241`.

## Call the routes directly

The panel and the CLI use these. They sit under `/api/dev`, outside the OpenAPI document.

| Route | Does |
| --- | --- |
| `GET /api/dev/personas` | Lists the personas. No session needed. |
| `GET` or `POST /api/dev/sign-in?as=<id>` | Signs the persona in; seeds an empty account. GET redirects, POST answers JSON. Both set the cookies. |
| `GET /api/dev/state` | The signed-in account, its persona, counts and settings. |
| `POST /api/dev/seed` `{ persona? }` | Empties the account and loads a persona's data. |
| `POST /api/dev/reset` | Empties the account. |
| `POST /api/dev/due` `{ count: n \| "all" }` | Makes exactly `count` cards due now and moves the rest to tomorrow or later. |
| `POST /api/dev/outbox` `{ to }` | The last account email sent to that address, so a confirmation or reset link can be opened without a real inbox. |

Seeding goes through the same services as the app and the API, so decks and cards carry audit rows and scheduling state. The review history is then replayed through the real scheduler in memory and written back in one go. The same persona seeds the same grades every time.

## How the gate works

Two gates, one at build time and one at run time. The Worker imports the `/api/dev` routes only inside an `import.meta.env.DEV` branch, so a production build contains none of the routes, the persona fixtures, the fixed password, or the seed and reset services. At run time, `devToolsEnabled` in `apps/web/src/server/env.ts` is true only when `PRODUCT_URL` has a loopback hostname. It decides whether the routes answer, whether a `@lymi.local` address may create an account, and whether that address skips the confirmation email. Email and password sign-in itself is no longer local-only: it is how anyone without a Google account gets in. Production's `PRODUCT_URL` is `https://my.lymi.app`, so even a build that carried the routes would answer 404.

The client side is gated the same way. The panel and the boot guard that drops the persisted query cache when the persona changes are dynamic imports behind `import.meta.env.DEV`, so the production bundle never includes them. Sign-out and every sign-in path clear the same persisted state through `clearPersistedLearnerState`, so a real account signed in after a persona never inherits its cache or queued grades.

The Playwright suite runs the product through Vite with a loopback `PRODUCT_URL`, so the routes exist there too. The tests do not use them: `docs/testing.md` keeps the canonical journey on the public flows.
