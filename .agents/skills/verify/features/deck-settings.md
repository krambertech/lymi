# Deck settings

An owner's deck settings save each change as it is made: the name and description when the field is left, the language, how cards are asked, the fields AI can fill and its instructions, sections, people and visibility. A member sees **About this deck** instead, without the AI settings.

## Reach

A deck's page, then its settings link; or `/library/<deck id>/settings`.

## Drive

[`deck-settings.mjs`](deck-settings.mjs), as `learner` on **Lezione 12**: rename it, ask its cards **Both ways**, let AI fill **Notes** with instructions, then reload.

## End state

`/api/decks` stores the new name, `directions` both, `notes` among `enrichFields` and the instructions, and after a reload every field shows them and the back link carries the new name.

## Gotchas

- The name, description and instructions save on leaving the field, not on typing; press Tab before reading the API.
- The AI checkboxes flip only once the saved deck comes back, so Playwright's `check()` reports no change; click and wait for the checked state.
- Sections, people and visibility are not driven yet; add steps when a change touches them.
