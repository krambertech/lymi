---
status: accepted
date: 2026-09-06
---

# Review is a button; Settings and Activity live under You

The navigation carries two destinations: Today and Library. Review is the primary button on both, never a tab. Settings, Activity and Archived live behind one profile screen at `/you`, reached from the avatar on the phone and the sidebar's profile row on desktop. On the phone the navigation is a floating frosted pill of two items; on desktop it is a sidebar inside a shell capped at 1120 px and centred.

Insights holds a sidebar slot and a `/insights` route before it has content, so the list does not reorder when it lands.

## Considered options

- **Review as the centre tab.** Rejected: Review starts an action rather than opening a screen to browse. A button beside each due count makes that action available on both Today and Library.
- **Settings as a top-level tab.** Rejected: an infrequently used screen took a quarter of the tab bar. Activity also needed a direct entry under You so integration writes were easier to find than inside Settings.
- **Decks as the home screen.** Rejected: a deck list reduces daily review to a bar and leaves less space for the full-size lantern's due and nothing-due states.
- **A full-width desktop layout.** Rejected: stretching one content column across a 2560 px screen makes it harder to read.

## Consequences

- Every screen with a due count carries its own Review button. Today's is in the hero; Library's is in a bar above the decks.
- `/decks` became `/library`, and `/decks/$deckId` became `/library/$deckId`. Library is the screen; a deck is still a deck.
- Capture cannot belong to a route, because the plus appears in the sidebar and in every page header. `AddCardProvider` in `lib/add-card.tsx` owns the sheet and `N` opens it from anywhere.
- The streak is drawn twice: a flame pill in the phone's Today header, a plate beside the hero on desktop. `StreakPill` and `StreakPlate` show the same streak at different levels of detail.
- `--shell: 1120px` is a token. Anything that wants the full window has to say so.
