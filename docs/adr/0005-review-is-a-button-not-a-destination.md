---
status: accepted
date: 2026-09-06
---

# Review is a button, not a destination, and rarely-opened screens live behind You

The navigation carries two destinations: Today and Library. Review is the primary button on both, never a tab. Settings, Activity and Archived live behind one profile screen at `/you`, reached from the avatar on the phone and the sidebar's profile row on desktop. On the phone the navigation is a floating frosted pill of two items; on desktop it is a sidebar inside a shell capped at 1120 px and centred.

Insights holds a sidebar slot and a `/insights` route before it has content, so the list does not reorder when it lands.

## Considered options

- **Review as the centre tab.** Rejected after building it: the lantern in a tab bar reads as decoration, and a destination that immediately leaves is not a destination. Two buttons on the two screens that carry a due count cost nothing and put the action where the count is.
- **Settings as a top-level tab.** Rejected: a monthly screen took a quarter of the tab bar. Activity had the reverse problem, planned inside Settings where nothing an integration wrote would be seen.
- **Decks as the home screen.** Rejected: the daily ritual becomes a bar above a list, and the two lantern states that carry the most meaning, glowing when something is due and unlit when nothing is, have nowhere to happen at full size.
- **A full-width desktop layout.** Rejected: a vocabulary app is one column of content. At 2560 px a stretched sidebar-plus-column is a worse read, not a better one.

## Consequences

- Every screen with a due count carries its own Review button. Today's is in the hero; Library's is in a bar above the decks.
- `/decks` became `/library`, and `/decks/$deckId` became `/library/$deckId`. Library is the screen; a deck is still a deck.
- Capture cannot belong to a route, because the plus appears in the sidebar and in every page header. `AddCardProvider` in `lib/add-card.tsx` owns the sheet and `N` opens it from anywhere.
- The streak is drawn twice: a flame pill in the phone's Today header, a plate beside the hero on desktop. One component pair, `StreakPill` and `StreakPlate`, because the two treatments carry different amounts of the same fact.
- `--shell: 1120px` is a token. Anything that wants the full window has to say so.
