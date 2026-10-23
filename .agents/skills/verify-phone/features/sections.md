# Making and archiving sections

The deck's owner makes a section from **Deck options** › **New section**, or from a selection's **Move to section**, whose sheet lists the sections, **No section** for cards that are in one, and **New section**, which names a section and moves the chosen cards into it in one write. Archiving a section with cards on the Sections page asks first: **Keep the cards** leaves them in the deck without a section, **Archive its N cards too** takes them with it; either way it happens at once with **Undo**. An empty section archives without asking.

## Reach

The learner's own deck: **Deck options** for New section and Select cards; `lymi://library/sections?id=<deck>` for the Sections page, where a section's row swipes open on Rename and Archive.

## Drive

- [`sections-create.yaml`](sections-create.yaml), as `learner`, on the learner's own deck, which [`sections-create.mjs`](sections-create.mjs) checks has no sections: Select all, **Move to section** (offered with no sections), **New section**, name it and **Create section**, and see **Moved to …**; then **Deck options** › **New section** makes an empty one.
- [`sections-archive.yaml`](sections-archive.yaml), as `learner`, after [`sections-archive.mjs`](sections-archive.mjs) gives the deck two sections of five cards: swipe the first, **Archive**, **Archive its 5 cards too**; swipe the second, **Archive**, **Keep the cards**, then **Undo**.

## End state

After create, every card of the deck is in the first new section and the second holds none. After archive, the first section is archived with five archived cards and the second is active again with its five.

## Gotchas

- Toast titles isolate the section's name, so the flows match it with `.*` on each side.
- A swiped row's actions are plain buttons named **Rename** and **Archive**; archiving the first row makes the second the new Section 1.
