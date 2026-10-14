# Series

A series groups decks under one heading in Library and reviews them together; deleting one is the only series write with no Undo, so iOS asks first and the learner chooses whether its decks stay or are archived.

## Reach

The **Library** tab, then a series heading's **Options for …** menu.

## Drive

[`series.yaml`](series.yaml), as `learner`: [`series.mjs`](series.mjs) first makes **Weekend reading** around the first deck. Open **Library**, open **Options for Weekend reading**, press **Delete series**, check the alert's title and message, and press **Keep the decks**.

## End state

The heading leaves Library. `/api/series` no longer holds the series, and `/api/dev/state` counts the same active decks as before.

## Gotchas

- No persona seeds a series, so the check fails loudly if one ever does under the same name.
- The alert is iOS's own, so its buttons are found by their text like any other control.
