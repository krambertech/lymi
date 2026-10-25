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

## Run tests while you work

`pnpm test:watch` runs the product's Vitest in watch mode on the `unit` project and the desktop Chromium component instance. A save reruns only the tests that import what changed, and no other browser starts. Before a push, `pnpm verify:changed` adds the static checks; [`docs/testing.md`](testing.md) has what runs at each gate.

## Become a persona

Open this URL in a browser and you are signed in and on Today:

```text
http://localhost:5241/api/dev/sign-in?as=learner
```

No password is typed anywhere. The server creates the account on first use, seeds it if it is empty, sets the session cookie, and redirects. Add `returnTo=/library` to land elsewhere, `reset=1` to reseed an account that already has data, or `seed=0` to sign in and leave the data as it is.

| Persona | Account | Starts with |
| --- | --- | --- |
| `fresh` | Fresh | Nothing. The first-run screens. |
| `learner` | Kateryna | A little of everything. Three weeks in: Lezione 12, Verbi and Portuguese as before, plus the series Italiano A2 (Casa and In città) with three pictures, five important cards and two hints, Noor's shared Lisboa a dois, and Everyday Finnish from Explore. 9 due, a 4-day streak with a longer best run and two rest days, three cards an assistant added today, one archived deck and one archived card. |
| `streak` | Sanna | Fourteen days running and nothing due. The flame is lit, small and still. |
| `rested` | Leena | Eleven days running through two rest days, the last one yesterday, and 9 due. Today opens on the rest-day banner. |
| `backlog` | Marco | A month away: four decks, 60 cards, all due. |
| `long` | Ingrid | Six German cards asked both ways, all due: a sentence as the term, a dictionary-length meaning, and a card with every field at its limit. |
| `polyglot` | Оксана | Ukrainian interface and meanings. Italian, Finnish, and a deck with no language. |
| `heavy` | Vera | Four years of daily study, to profile at scale: 27 decks from 0 to 4,500 cards (11,900 in all), three series, a 2,250-card deck in 24 sections, two decks asked both ways, three archived decks, about 200 important cards and 40 hints, about 112,000 reviews and 400 due. It seeds in about 40 seconds. On the phone, **Dev sign-in as heavy** signs in as it. |
| `japanese` | Mika | Five months of Japanese with English meanings: 169 real words and sentences in JLPT sections, kanji with kana readings, kana-only words, katakana loanwords, examples with inline furigana, and a numbers deck asked both ways. |
| `shared` | Noor | Owns Lisboa a dois with four learners (Kateryna, Tomás and the companion accounts Ana and Pedro), a waiting invitation to mira@example.com and its join link on. A learner in Ana's deck, with Everyday Estonian added in its Ukrainian edition. |
| `joining` | Tomás | Joined Noor's deck through its link and has not got set up. Signing in without `returnTo` opens `/welcome?deck=<id>`, the Welcome that arriving from a join link opens. |
| `publisher` | Lymi | The publisher account: one Estonian deck in three sections, published as `everyday-estonian` with an English original and a signed-off Ukrainian edition, beside Finnish and driving decks and five small Japanese decks under production's slugs, so Welcome's Japanese offer can be seen. |

Shared decks are written down once, on the owner's deck, so seeding either side makes sure the other account exists: seeding Noor joins Kateryna, Tomás, Ana and Pedro, and reseeding Kateryna rejoins Noor's deck. A member persona whose account holds nothing yet is seeded first. The product grants members only the learner role so far ([ADR 0011](adr/0011-a-shared-deck-is-one-deck-with-many-learners.md)).

The accounts are `<id>@lymi.local`. They exist only on a loopback origin, and they are created already confirmed so no confirmation email stands between the URL and the app. `pnpm local personas` prints the same table from the running server.

To see a deck's join page, turn on its join link in deck settings and open the link signed out, or signed in as another persona with `/api/dev/sign-in?as=streak&returnTo=/join/<token>`. Adding `?dev=1` to a join link offers the local email sign-in, which carries the link through sign-in like Google does, so a new address lands in the deck.

To see a published deck's public page, seed the `publisher` persona, then build the site and serve it from `apps/site` with `pnpm exec wrangler dev --persist-to ../web/.wrangler/state` to read the product's local D1, and open `/explore` for the catalogue or `/explore/everyday-estonian` for one deck. `/uk/explore/everyday-estonian` is the same deck's Ukrainian edition: the same Estonian terms in the same order, with Ukrainian meanings, section names, title and summary. `/ru/explore/everyday-estonian` has no edition, so it falls back to the English original. Adding from either page pins that edition on the membership, which is what a second persona sees in Library and in review. The add link follows `PUBLIC_PRODUCT_URL` at build time. Two local runtimes writing to one D1 can crash on `SQLITE_BUSY` ([workers-sdk#14916](https://github.com/cloudflare/workers-sdk/issues/14916)), so stop the site server before heavy product writes such as an import.

To publish a deck of your own instead, add `PUBLISHER_EMAILS=learner@lymi.local` to `apps/web/.dev.vars` and call `PUT /api/decks/<id>/publication`. Another edition takes three calls: `PUT /api/decks/<id>/editions/uk` writes its text, `POST /api/decks/<id>/editions/uk/approval` signs it off, and `PUT /api/decks/<id>/editions/uk/publication` puts it on the page. `GET /api/decks/<id>/editions` says what is still missing or stale. One write takes at most 500 cards, and further writes add to the same edition; `node scripts/publish-edition.mjs` sends a longer edition in parts and publishes it only once every part has landed. `DELETE /api/decks/<id>/publication` withdraws a deck, and `?redirectTo=<slug>` makes its public page send visitors to another published deck with a 301 (`node scripts/withdraw-deck.mjs` wraps it); publishing it again brings it back. `GET /api/reports/decks` reports adds, first reviews, returning learners and page views for every deck you have published.

A real account signed in locally through Google works with every tool below too; it just has no persona of its own, so seeding it loads `learner` unless another persona is named.

## Change the state from the palette

Backtick opens the developer palette over any product screen. Type to search commands, personas, languages and themes; a number after a space sets a command's count, so `due 12` runs "Make 12 cards due". The arrow keys move, Enter runs, Escape goes back from a page and then closes, and Backspace on an empty search goes back too. Recent keeps the last three commands with the count each ran with.

A small tab on the end edge of every product screen shows the current persona's avatar and opens the same palette without a keyboard. On a phone or a touch screen the palette fills the screen, waits for a tap before raising the keyboard, and shows every persona's face above the list. Dragging the tab moves it up or down the edge, and the position is remembered. The palette keeps its own dark graphite look in both themes, so it never passes for product UI.

- **Personas**: Switch persona lists each one under Start, Everyday, Languages, Scale and edges, or Together, with what it holds. Choosing one signs you in as that account and reloads the screen you were on, except Tomás, who lands on his Welcome.
- **Simulate**: states that are slow or impossible to reach by hand. Claude adds cards (an Activity row naming the app), enrich cards (AI examples and an enrichment row), forget cards (Forgotten today), make cards often forgotten (the slipping round, with a Forgot on the latest past days that already hold reviews), reach today's goal, leave a few reviews to today's goal (it reopens a met day, so the goal's end of review can be played again), make cards due, and the owner adds cards (new cards in a shared deck this account learns from, written by its owner). A command that cannot do anything for this account says why.
- **Account**: Reseed puts the account back to its persona's starting data; switching persona does not. Empty this account removes everything. Both run on a second press and never appear in Recent.
- **View and Open**: English, Ukrainian or Russian, which the meaning language follows; system, light or dark; a sign-in link to the current screen as the current persona; `/design`, `/emails` and the API docs.

The server owns the list of commands at `/api/dev/commands`, so the palette and `pnpm local` show the same ones, and each row shows the id that runs it from a terminal. Each command refreshes the queries behind the screen, so Today, Library and Insights update without a reload. The palette is compiled into the Vite dev server only; a production build has no trace of it.

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
pnpm local commands --as learner  # what the palette can do to this account
pnpm local forget 3 --as learner  # any palette command, with an optional count
pnpm local db:fresh               # rebuild the local D1 from the migrations
```

`--as` defaults to `LYMI_PERSONA`, then `learner`. `--url` defaults to `LYMI_URL`, then `PRODUCT_URL` in `apps/web/.dev.vars`, then `http://localhost:5241`.

## Run the phone app in a Simulator

[Stim](https://stim.appandflow.com) gives each worktree its own Simulator, Metro port and Worker port, and stops all of them with one command. Every worktree installs one shared dev client instead of compiling its own. Run the commands from `apps/mobile`.

Reserve this worktree's Worker port, then start the Worker on it in its own terminal:

```bash
pnpm exec stim ports get api
```

```bash
pnpm --filter @lymi/web dev --port <api port> --strictPort
```

Start Metro pointed at that Worker, then install and open the app:

```bash
EXPO_PUBLIC_API_URL=http://localhost:<api port> pnpm exec stim start
```

```bash
pnpm exec stim ios
```

`stim ios` creates this worktree's Simulator, named `stim-<worktree>-mobile`, boots it, installs the app and opens it on this worktree's Metro. It asks `buildCacheProvider` in `app.json` for the app, which looks it up in `~/Library/Caches/lymi/ios-dev-client` by the native fingerprint plus the Xcode build number. A worktree whose native side matches one already built installs in seconds. On a miss Stim builds once, stores the app in that cache and lets a second worktree with the same miss wait for it. The cache keeps the four most recently used apps.

**Stop the stack whenever you stop looking at the app**, because a booted Simulator holds about 2 GB:

```bash
pnpm exec stim stop
```

```bash
pnpm exec stim ports stop api
```

`stim stop` shuts the Simulator down and stops Metro. `stim ports stop api` stops the Worker. Metro keeps the environment it started with, so to point the app at another Worker, run `stim stop` before `stim start`. `stim status` lists every worktree's stack, and `stim gc` lists what Stim can reclaim from worktrees that are gone.

If the app reports `Cannot find native module` or a missing TurboModule, the cached binary is older than its native code, for example after an environment variable changed native config, which the fingerprint does not see. Run `stim ios --no-build-cache` to replace it.

If a native build stalls at `CreateBuildDescription`, the Mac's pipe memory is used up. Stop it and run `pnpm dev-client "Lymi <issue>" <metro port>` once instead: it kills a stalled build, names the processes holding the most pipes and retries, then stores the app in the same cache. Quitting the top process fixes it. When you change native code over and over, `pnpm dev-client` with `--keep-build` skips the clean prebuild, so the next build is incremental.

## Run the phone app on an Android emulator

Stim cannot see a system image without Android's `cmdline-tools`, so the Android build runs through Expo directly. Install Android Studio with an API 36 or later arm64 image and an AVD, and Java 17. Boot the AVD with `-gpu host`: API 37 images otherwise fall back to software rendering, and the Skia lantern then stalls the main thread until Android reports the app as not responding.

```bash
~/Library/Android/sdk/emulator/emulator -avd <avd> -gpu host -no-snapshot-save
```

Start the Worker and Metro as for the Simulator, then forward both ports, since the emulator's `localhost` is its own:

```bash
adb reverse tcp:<worker port> tcp:<worker port>
```

```bash
adb reverse tcp:8081 tcp:8081
```

`npx expo prebuild --platform android`, then `./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a` in `apps/mobile/android`, builds the dev client in about five minutes; `adb install -r` installs it, and `adb shell am start -a android.intent.action.VIEW -d "exp+lymi://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"` opens it on Metro. A file added with an `.android.tsx` twin needs `expo start --clear` once, or Metro keeps serving the shared file. The developer menu's floating button covers the top bar's actions; write `<boolean name="showFab" value="false" />` into `shared_prefs/expo.modules.devmenu.sharedpreferences.xml` with `adb shell run-as app.lymi` to hide it.

## Sign the phone app in

`EXPO_PUBLIC_API_URL` points the phone app at a Worker, and it defaults to production, so always set it on `stim start`. `EXPO_PUBLIC_SITE_URL` points its docs and guide links, and the addresses some connected apps sign in from, at a public site, and defaults to `https://lymi.app`. The Simulator reaches the Mac at `localhost`. In a development build, or any build pointed at a Worker on `localhost`, the sign-in screen offers **Dev sign-in as learner** and **Dev sign-in as heavy**, which call `POST /api/dev/sign-in?as=<persona>` and keep the cookie it returns, so no password is typed. A new account made in the app is confirmed with a 6-digit code instead of a link; `POST /api/dev/outbox` with the address returns the email that carries it. Google needs `GOOGLE_CLIENT_ID` and a callback registered for the local port, so try it against a deployed Worker.

## Profile the phone app

Measure speed in a Release build, never the dev client, whose debug JavaScript and native code are many times slower. From `apps/mobile`, with this worktree's Worker running and `ios/` made by `stim ios` or `npx expo prebuild -p ios`, build once:

```bash
EXPO_PUBLIC_API_URL=http://localhost:<api port> xcodebuild -workspace ios/Lymi.xcworkspace -scheme Lymi -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build/release ARCHS=arm64 CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=
```

Turn off over-the-air updates in the built app, or it downloads production's bundle, then re-sign it and install it on this worktree's Simulator:

```bash
plutil -replace EXUpdatesEnabled -bool NO ios/build/release/Build/Products/Release-iphonesimulator/Lymi.app/Expo.plist
```

```bash
codesign --force --sign - --preserve-metadata=entitlements ios/build/release/Build/Products/Release-iphonesimulator/Lymi.app
```

```bash
xcrun simctl install <udid> ios/build/release/Build/Products/Release-iphonesimulator/Lymi.app
```

A JavaScript change needs no native build: `npx expo export:embed --platform ios --dev false --bytecode --entry-file node_modules/expo-router/entry.js --bundle-output <dir>/main.jsbundle --assets-dest <dir>` writes a new `main.jsbundle` to copy into the app before the three steps above. Sign in with **Dev sign-in as heavy** to measure at a devoted learner's size. Release Hermes has no sampling profiler; `sample <pid> 5` samples every thread of the running app with native symbols, and `performance.now()` marks logged with `console.error` reach `xcrun simctl spawn <udid> log stream`. Reinstall the dev client with `stim ios` before running verify-phone.

## Connect Readwise without an account

On a loopback or preview server, the token `lymi-dev-readwise-0000` reaches a fake Readwise with three invented books (Italian, Estonian, English) instead of readwise.io. Paste it in Settings → Apps → Readwise. A book's language comes from the AI, so without `AI_GATEWAY_URL` and `AI_GATEWAY_TOKEN` every book stays unknown until a later pull reads it again.

## Call the routes directly

The palette and the CLI use these. They sit under `/api/dev`, outside the OpenAPI document.

| Route | Does |
| --- | --- |
| `GET /api/dev/personas` | Lists the personas. No session needed. |
| `GET` or `POST /api/dev/sign-in?as=<id>` | Signs the persona in; seeds an empty account. GET redirects, POST answers JSON. Both set the cookies. |
| `GET /api/dev/state` | The signed-in account, its persona, counts and settings. |
| `GET /api/dev/commands` | The palette's commands for the signed-in account: id, group, title with `{count}`, the count's default and maximum, and why it cannot run now. |
| `POST /api/dev/commands/<id>` `{ count? }` | Runs one, with the count capped at its maximum, and answers with one sentence saying what happened. 409 with the reason when it cannot run. |
| `POST /api/dev/seed` `{ persona? }` | Empties the account and loads a persona's data. |
| `POST /api/dev/reset` | Empties the account, its review days included. |
| `POST /api/dev/cards` `{ count }` | Adds that many sample cards to the oldest deck, or a new one, written as the connected app Claude. |
| `POST /api/dev/enrich` `{ count }` | Fills the example of the newest cards without one, as the AI, with an enrichment audit row each. |
| `POST /api/dev/recall` `{ count, rating? }` | Grades that many due cards through the review service, Good unless `rating` says otherwise. |
| `POST /api/dev/goal` | Grades Good until today's goal is met, going past the due cards when they run out. |
| `POST /api/dev/slip` `{ count }` | Gives that many cards four lapses in six reviews on past review days, so they are often forgotten. |
| `POST /api/dev/often-forgotten` `{ hinted? }` | Replaces the deck Tricky Estonian with two often-forgotten cards with no hint, due now, so review offers one, and, unless `hinted` is false, a card that already has a hint, due now, so review shows the peek. |
| `POST /api/dev/due` `{ count: n \| "all" }` | Makes exactly `count` cards due now and moves the rest to tomorrow or later. |
| `POST /api/dev/cards/<id>/enriched` `{ fields }` | Marks the card's `meaning`, `example` or `pronunciation` as written by the enrichment, so the AI badge shows without a vendor key. |
| `GET /api/dev/mcp-host?view=<view>` | The MCP Apps view in a stand-in host, answered by the real MCP server as the signed-in account. `view` is `card`, `deck`, `due`, `insights`, `streak` or `home`; `theme`, `locale` and `width` are optional. Beside the frame it lists what the view told the host, such as a link it opened. `home` takes `deeplink=/card/<id>`. The view is built once per server start, so restart the server after changing it. |
| `POST /api/dev/outbox` `{ to }` | The last account email sent to that address, so a confirmation or reset link can be opened without a real inbox. |
| `GET /api/dev/emails/render?kind=&language=` | One email kind rendered with its sample data; the `/emails` page draws every kind with it, in both rooms and at phone width. |

Seeding goes through the same services as the app and the API, so decks and cards carry audit rows and scheduling state. The review history is then replayed through the real scheduler in memory and written back in one go. The same persona seeds the same grades every time.

## How the gate works

Two gates, one at build time and one at run time. The Worker imports the `/api/dev` routes only inside an `import.meta.env.DEV` branch, so a production build contains none of the routes, the persona fixtures, the fixed password, or the seed and reset services. At run time, `devToolsEnabled` in `apps/web/src/server/env.ts` is true only when `PRODUCT_URL` has a loopback hostname. It decides whether the routes answer, whether a `@lymi.local` address may create an account, and whether that address skips the confirmation email. Email and password sign-in itself is no longer local-only: it is how anyone without a Google account gets in. Production's `PRODUCT_URL` is `https://my.lymi.app`, so even a build that carried the routes would answer 404.

The client side is gated the same way. The palette and the boot guard that drops the persisted query cache when the persona changes are dynamic imports behind `import.meta.env.DEV`, so the production bundle never includes them. Sign-out and every sign-in path clear the same persisted state through `clearPersistedLearnerState`, so a real account signed in after a persona never inherits its cache or queued grades.

The Playwright suite runs the product through Vite with a loopback `PRODUCT_URL`, so the routes exist there too. The tests do not use them: `docs/testing.md` keeps the canonical journey on the public flows.

## Reading analytics

The production product Worker writes aggregate points to `lymi_events` and `lymi_requests`. Query them through the [Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/) with an account token that has Analytics Read permission. `_sample_interval` weights rows when Cloudflare samples them. These metrics contain no learner identifier, so sign-ins below are a count of events, not distinct daily active learners.

In `lymi_requests`, `index1` is the caller: `user` for a session, `api` for an API key, `mcp` for an authorized MCP call, `anon` for a request refused with 401, and `public` for a route that runs before authentication and never identifies the caller, such as `/api/auth/*`, `/api/join/*` and `/public/media/*`. `blob1` is the route pattern, or `unmatched` when no route answered. `blob2` is the method, `blob3` the status class, and `blob4` the phone release from `x-lymi-client`, such as `ios 1.2.0`, or `none` for the web, API keys and MCP. A release below the minimum version gets only 426, counted as `public` and `4xx`.

Daily sign-ins:

```sql
SELECT toStartOfDay(timestamp) AS day, SUM(_sample_interval) AS sign_ins
FROM lymi_events
WHERE index1 = 'signed_in' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day ORDER BY day DESC
```

Reviews by mode each week:

```sql
SELECT toStartOfWeek(timestamp) AS week, blob1 AS mode, SUM(_sample_interval) AS reviews
FROM lymi_events
WHERE index1 = 'review_graded' AND timestamp > NOW() - INTERVAL '90' DAY
GROUP BY week, mode ORDER BY week DESC, mode
```

API and MCP requests by route:

```sql
SELECT index1 AS actor, blob1 AS route, SUM(_sample_interval) AS calls
FROM lymi_requests
WHERE index1 IN ('api', 'mcp') AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY actor, route ORDER BY calls DESC
```

Phone releases still calling, to choose a minimum version:

```sql
SELECT blob4 AS release, blob3 AS status, SUM(_sample_interval) AS calls
FROM lymi_requests
WHERE blob4 != 'none' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY release, status ORDER BY release DESC
```
