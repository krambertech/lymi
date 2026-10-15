# Long-press menus

A list row opens iOS's context menu on a long press: a deck under **Decks to review** on Today, a card on a deck's page and in search, a section's heading, and a deck in Explore. A card lifts its revealed side as a preview; a deck lifts its page. Each menu row is also a VoiceOver action on the row ([phone.md](../../../../docs/design/system/phone.md#menus)).

## Reach

Hold a row on Today, a deck's page, Library search or Explore.

## Drive

[`row-menus.yaml`](row-menus.yaml), as `learner`: hold the first deck under **Decks to review** and check **Review**, **Add a card** and **Open deck**, then take **Open deck**. On a deck's page, opened by link since the phone's due list can lag a persona reset, hold a card and take **Mark important**, then hold another and take **Archive card** and **Undo** in its toast. In Explore, hold **Everyday Estonian** and take **Add to Library**. Search for the second card, hold it and take **Mark important**.

## End state

[`row-menus.mjs`](row-menus.mjs) reads the stored state: the first card is important, the second is still in the deck after Undo and is important from search, and Library holds Everyday Estonian. It seeds the `publisher` persona first, since Explore lists only what it has published.

## Gotchas

- Today's last row can sit under the floating tab bar, where a press lands on the Library tab, so the flow centres a row before holding it.
- Rows sit inside expo-router's `Link.Trigger`, but each row's own wrapper carries its VoiceOver label, so Maestro finds it by that label, such as **affollato, crowded, Known**.
- The menu's rows are iOS's, found by their text. An Explore deck's peek is its page, whose own **Add to Library** sits above the menu's, so the flow takes the second.
- A section heading's menu needs a deck with sections, which `learner` has none of; hold one on Everyday Estonian once it is added, or as `publisher`, who owns it and also sees **Rename section**.
