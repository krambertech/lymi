# Entry points

iOS's ways into the app from outside it: the controls for Control Center, the Lock Screen and the Action button, Siri, Shortcuts and Spotlight, and the app icon's long-press actions (#546). Each opens the app on a link that names the screen and the entry point (`apps/mobile/src/entry/links.ts`), so a learner who is signed out lands on sign-in and then continues.

## Reach

Outside the app: Control Center's **Add a word** and **Review**, a Lock Screen corner or the Action button set to either, Siri ("Add a word to Lymi", "Review in Lymi", "What’s due in Lymi"), the Shortcuts app, Spotlight, and a long press on the app icon (**Add a word**, **Review**, **Search**).

## Drive

[`entry-points.yaml`](entry-points.yaml), as `learner`: open each link an entry point opens, as Maestro's `openLink`, since Maestro cannot drive Control Center, Siri or the Home Screen. Add a word's link carries a term, as the Add a word intent sends it from Shortcuts.

## End state

Add a word opens with the term filled in and the keyboard up, Review opens on the first card, and Search opens on its field. [`entry-points.mjs`](entry-points.mjs) checks that opening Add a word added no card.

## Gotchas

- The controls, the intents and the quick actions themselves need a hand in the Simulator: add a control from Control Center's edit mode, run an intent from the Shortcuts app, and long-press the icon on the Home Screen. Siri does not run in the Simulator.
- App Shortcuts fail with "Unable to run App Shortcut" on every iOS 26.5 Simulator, Apple's own sample included; run them on an iOS 18 Simulator or a device. The controls run there fine.
- A control's value is what the app last wrote to the app group, so it changes only after the app has synced since the review.
