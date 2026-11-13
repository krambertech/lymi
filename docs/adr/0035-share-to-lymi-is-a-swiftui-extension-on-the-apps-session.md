---
status: accepted
date: 2026-10-13
---

# Share to Lymi uses SwiftUI with the app's session

Share to Lymi is an iOS share extension written in SwiftUI in `apps/mobile/targets/share`, built by `@bacons/apple-targets`. It adds a card from the selected text without leaving the app it was shared from. The app copies what the extension needs, its session, the learner's own decks and the sheet's strings, into the shared keychain under the app group, and the extension calls the Worker as the app does. This narrows [ADR 0029](0029-the-phone-app-is-expo-react-native-sharing-core.md), which ruled out native Swift for screens.

The deck is chosen by the term's language. The sheet opens on the deck it added to last, or Add a word's, and `POST /api/cards/deck-choice` moves it to the learner's deck in the term's language, the one added to last when several teach it.

## Context

Issue #509 asked for words shared from Safari, Notes or a transcript to become cards, and the phone vision session (#542) chose a Lymi sheet inside the share sheet so the learner stays where they were reading. A share extension may use about 120 MB, and React Native inside one leaves little room for it. Kateryna wanted Lymi to pick the deck. Apple's language detector has no Estonian, and its on-device model supports neither Estonian nor Ukrainian and runs only on Apple Intelligence iPhones.

## Considered options

- **A SwiftUI extension on the app's session, the server choosing the deck:** accepted. It is small, opens at once, and the model uses the learner's deck languages to disambiguate a single term.
- **React Native in the extension (`exportJs`):** rejected for the memory limit and the start-up time of a second JavaScript runtime.
- **Opening the app with the shared text:** rejected, because the learner leaves what they were reading.
- **Apple's on-device detection:** rejected, because it cannot name Estonian, the language Lymi's first learner studies.
- **Always the last deck, or a deck list on every share:** rejected in favour of automatic deck choice, which the learner can change with one tap.

## Consequences

- The extension cannot run Lingui, so the app formats its strings into the shared item, as it does for the widgets; the extension keeps English only for before the app has run.
- Colours come from `packages/design`'s generated tokens at prebuild, and Onest is copied from the app's font package, so neither is kept by hand.
- Changing the extension's Swift needs a native build; the app's JavaScript can change without one.
- Choosing a deck costs one model call per share when the learner's decks teach two or more languages. A script only one language uses, such as kana, is read without one, and offline or unsure the sheet stays on its deck.

[Issue #509](https://github.com/krambertech/lymi/issues/509)
