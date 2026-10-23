---
name: verify-phone
description: Prove a change to the iPhone app works by driving it in a Simulator as a learner and keeping the evidence. Use before calling a phone change done, when reviewing a phone pull request, or when asked whether a feature works in the real app. Skip changes with no phone effect; the web product has its own verify skill.
---

# Verify the phone app

A change is verified when the feature it touches has been driven in the running app, by its visible text and accessibility labels, and the stored state agrees with the screen. Typechecks, the phone's unit and contract tests and green CI are not this proof, and neither is reading the code. It is the phone's counterpart of [`verify`](../verify/SKILL.md): the same feature map, doctor and evidence, with Maestro in place of Playwright and a Simulator in place of a browser.

## Pick the features

[`features/`](features) has one entry per learner-facing feature: what it is, how a learner reaches it, how to drive it, the end state that proves it, and its gotchas. Each entry has a Maestro flow, `<feature>.yaml`, and a `<feature>.mjs` that gives the flow the values it should see and reads the stored state afterwards. Drive every entry the diff can reach. When the diff touches a feature with no entry, write its entry, flow and check in the same pull request.

| Feature | Entry |
| --- | --- |
| Sign in with Apple | [sign-in.md](features/sign-in.md) |
| Today | [today.md](features/today.md) |
| Review | [review.md](features/review.md) |
| Archive in review | [review-archive.md](features/review-archive.md) |
| Add a card | [add-card.md](features/add-card.md) |
| Card choices: tags, picture modes, picture description | [card-choices.md](features/card-choices.md) |
| Library and the deck page | [library.md](features/library.md) |
| Deck filters | [deck-filters.md](features/deck-filters.md) |
| Series | [series.md](features/series.md) |
| Insights | [insights.md](features/insights.md) |
| Language | [language.md](features/language.md) |
| Delete account | [delete-account.md](features/delete-account.md) |
| Long-press menus | [row-menus.md](features/row-menus.md) |
| Enrich a card | [card-enrich.md](features/card-enrich.md) |
| Section heading menu | [section-menu.md](features/section-menu.md) |
| Deck tools: selection, Go to, waiting cards, Add card here | [deck-tools.md](features/deck-tools.md) |
| Share deck and join links | [sharing.md](features/sharing.md) |
| Entry points: controls, intents, quick actions | [entry-points.md](features/entry-points.md) |
| Welcome, and arriving from a deck link or a join link | [welcome.md](features/welcome.md) |
| Import and export | [import-export.md](features/import-export.md) |
| API keys and connected apps | [keys-and-apps.md](features/keys-and-apps.md) |
| Smart add | [smart-add.md](features/smart-add.md) |
| Japanese: furigana in review, rows, the card page and search; the Japanese face | [japanese.md](features/japanese.md) |
| Chinese: pinyin over each hanzi in review, simplified and traditional | [chinese.md](features/chinese.md) |
| Cantonese: Jyutping over each character in review, 𨋢 included, and its example fade | [cantonese.md](features/cantonese.md) |
| Russian: stress in place on the cue and the field named Stress | [russian.md](features/russian.md) |
| Ukrainian: stress in place on the cue, і included, and the field named Stress | [ukrainian.md](features/ukrainian.md) |
| Tamil: each word's reading over it in review, and fading over Known words in examples | [tamil.md](features/tamil.md) |
| Right to left: an Arabic deck's cue, example, rows and toast in their own direction | [right-to-left.md](features/right-to-left.md) |

## Launch

You need Xcode with an iOS 26 runtime, Maestro, and Java 17 or later (the runner sets `JAVA_HOME` to Homebrew's `openjdk` when it is unset). Run with the Node in `.nvmrc` and `LANG=en_US.UTF-8`.

```bash
node .agents/skills/verify-phone/scripts/stack.mjs start
```

It writes `apps/web/.dev.vars` from the example when there is none, migrates the local D1, and starts this worktree's Worker on the port `stim ports get api` reserves for it. It then runs [Stim](https://stim.appandflow.com): `stim start` starts Metro with `EXPO_PUBLIC_API_URL` pointing at that Worker, and `stim ios` creates this worktree's own Simulator, `stim-<worktree>-mobile`, boots it and installs the shared cached dev client ([local development](../../../docs/local-dev.md#run-the-phone-app-in-a-simulator)). Only a change to native code builds; otherwise the install takes seconds, though it waits while another worktree's native build of the same fingerprint runs. The Worker's port and process group, Metro's port and the Simulator's UDID go to `apps/mobile/.expo/verify-phone.json`, and the Worker's log beside it.

Never drive another worktree's Simulator, Metro or Worker, and never address a Simulator as `booted`: every command here takes the UDID.

## Doctor

```bash
node .agents/skills/verify-phone/scripts/doctor.mjs --persona learner
```

One read-only check that the stack is worth driving. The Worker must answer `/api/health` as `lymi-product` and the process on its port must run from this worktree's `apps/web`; Metro must report itself running from this worktree's `apps/mobile`; the Simulator with the recorded UDID must have the name `start` recorded, be booted, with `app.lymi` installed. With `--persona`, `/api/dev/state` must report that persona. The runner calls the doctor with its own session after resetting the persona and stops before driving when any check fails.

## Drive

```bash
node .agents/skills/verify-phone/scripts/run.mjs review add-card --pr <n>
```

For each feature the runner resets the persona with `POST /api/dev/sign-in?as=<persona>&reset=1`, so it starts from the persona's own data whatever ran before, and runs the doctor. It turns off the dev client's developer-menu introduction and floating button, which cover the top bar's controls, relaunches the app on this worktree's Metro, since a dev client opened without a URL reconnects to the last Metro it saw, and runs the flow. Every flow starts with [`_open.yaml`](features/_open.yaml), which waits for the bundle, closes the developer menu if it still shows, and signs in by **Dev sign-in as learner** when the app is signed out, so no password is typed. When Maestro's driver loses the app mid-snapshot without a command failing, which happens on a loaded Mac, the runner runs the flow once more and says so in `maestro.log`. The flow receives the values it asserts, such as the due count, from the feature's `env()`, then the feature's `check()` polls the stored state until it agrees or 20 seconds pass. Personas are in [Become a persona](../../../docs/local-dev.md#become-a-persona).

Find controls by the text and accessibility labels a VoiceOver user hears, never by position; `maestro --device <udid> hierarchy` prints what the app exposes. The one exception is written down in its entry's gotchas with the reason.

Learner text holding a right-to-left letter, such as an Arabic deck in **Archived “…”**, is wrapped in invisible Unicode isolates, U+2068 and U+2069, inside interface text, so a flow that may meet one matches it with `.?` on each side: `Archived “.?${DECK}.?”`.

## Evidence

Every flow keeps a screenshot at each `takeScreenshot`, numbered in order, plus the persona's state before (`00-before.state.json`), and after it the screen (`99-end.png`), Maestro's view hierarchy (`99-end.hierarchy.json`) and the stored state the check read (`99-end.state.json`). `maestro.log` holds every command, and Maestro's own debug folder holds its per-command screenshots when a command fails. `verdict.md` beside them lists the doctor's result, the values the flow was given, each command as Maestro reported it, the stored-state check, and every error Metro or the app logged while the flow ran, read from Stim's log timeline for this worktree. A run with Metro errors is not a clean pass even when the flow passed; say what they were.

Evidence goes to `/mnt/project-files/evidence/pr-<n>/<feature>-phone-<sha>/` when the project folder exists, else to the temp directory, so it outlives the worktree and the Simulator. Name the folder in the pull request and attach the screenshots a reviewer needs. Persona data is local and seeded, so the files carry no private content; never drive a real account to produce them.

## Cleanup

```bash
node .agents/skills/verify-phone/scripts/stack.mjs stop
```

It ends the Worker process group `start` recorded, then runs `stim stop`, which stops this worktree's Metro and shuts its Simulator down, since a booted Simulator holds about 2 GB. Stop as soon as you stop looking at the app: when the pull request waits on CI or review, and when you are done. Keep the evidence. A failing flow is a finding to report or fix, never a reason to delete its files.
