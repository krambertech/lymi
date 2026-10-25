# Entry points

iOS's ways into the app from outside it: the controls for Control Center, the Lock Screen and the Action button, Siri, Shortcuts and Spotlight, and the app icon's long-press actions. Each opens the app on a link that names the screen and the entry point (`apps/mobile/src/entry/links.ts`), so a learner who is signed out lands on sign-in and then continues. Add a card is the exception: it saves a card from Shortcuts, Siri, Spotlight or the Action button without opening the app, and continues in Add a word only when signed out or offline.

## Reach

Outside the app: Control Center's **Add a word** and **Review**, a Lock Screen corner or the Action button set to either, Siri ("Add a word to Lymi", "Add a card to Lymi", "Review in Lymi", "What’s due in Lymi"), the Shortcuts app, Spotlight, and a long press on the app icon (**Add a word**, **Review**, **Search**).

## Drive

[`entry-points.yaml`](entry-points.yaml), as `learner`: open each link an entry point opens, as Maestro's `openLink`, since Maestro cannot drive Control Center, Siri or the Home Screen. Add a word's link carries a term, as the Add a word intent sends it from Shortcuts.

Add a card needs a hand: in the Shortcuts app make a shortcut with Lymi's **Add a card**, give it a term and, optionally, a deck, and run it with the app closed (`xcrun simctl terminate <udid> app.lymi` first).

## End state

Add a word opens with the term filled in and the keyboard up, Review opens on the first card, and Search opens on its field. [`entry-points.mjs`](entry-points.mjs) checks that opening Add a word added no card. Add a card shows “Added “…” to …” over Shortcuts while the app stays closed, the card is in that deck in `/api/dev/state`, and running it again says ““…” is already in …” and adds nothing.

## Gotchas

- The controls, the intents and the quick actions themselves need a hand in the Simulator: add a control from Control Center's edit mode, run an intent from the Shortcuts app, and long-press the icon on the Home Screen. Siri does not run in the Simulator.
- App Shortcuts fail with "Unable to run App Shortcut" on every iOS 26.5 Simulator, Apple's own sample included; run them on an iOS 18 Simulator or a device. The controls run there fine. `pnpm exec stim ios --slot ios18 --runtime 18.0` in `apps/mobile` installs the same cached client on an iOS 18 Simulator of this worktree's own; point `apps/mobile/.expo/verify-phone.json` at its UDID and name so the runner signs it in, and shut it down after, since `stack.mjs stop` stops only the default slot.
- Add a card reads the session Share to Lymi keeps in the keychain, so open the signed-in app once after a reset before running it, or it asks to continue in the app.
- A control's value is what the app last wrote to the app group, so it changes only after the app has synced since the review.
