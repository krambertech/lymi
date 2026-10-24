# Search

Library's search opens over everything with its field at the foot and the keyboard up. Typing fills the screen with matching decks, then cards. A tap or drag that sends the keyboard away from an empty field closes the search; with text in the field the keyboard leaves and the results stay. Close search always leaves.

## Reach

The **Search** button in Library's bar, or `lymi://search?q=…`. A deck's **Search this deck** opens the same screen narrowed to that deck, and Explore's **Search decks** opens its own screen with the same bar.

## Drive

[`search.yaml`](search.yaml), as `learner`: open **Library**, tap **Search**, tap the empty screen and check Library is back; open **Search** again, type a word nothing matches, tap above the empty state and check the field and **No decks or cards match** stay; then tap **Close search**.

## End state

Library shows **New deck** and no search field after each close, and the field is still there after the tap with text in it. Searching writes nothing, so the stored card count is unchanged, which [`search.mjs`](search.mjs) checks.

## Gotchas

- The taps on empty space go by position, since empty space has no label: high on the screen, where neither a result nor the empty state's **Clear search** sits.
- A word with matches would put rows where the second tap lands, so the flow types one nothing matches.
