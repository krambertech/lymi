# Offline writes

A deck or card made while nothing reaches the server shows at once, outlives a reload, and lands in the order it was made once the connection returns. Writes queue under `lymi-writes:` in local storage; grades have their own outbox.

## Reach

Any write while the device is offline: a new deck from **Add** then **New deck**, or a card from the deck page.

## Drive

[`offline-writes.mjs`](offline-writes.mjs), as `learner` from Library: abort every non-GET request to `/api/decks` and `/api/cards`, make the deck **Offline lesson** and the card `la fretta` in it, reload, then let writes through and reload again.

## End state

While cut off, **Notifications** says the card is **saved on this device**, both survive the reload, and `/api/decks` has no Offline lesson. Once writes pass, `/api/decks` shows Offline lesson with 1 card, the card is stored in that deck, and no `lymi-writes:` key is left.

## Gotchas

- Cut writes only: the screen still needs its reads, so aborting everything tests a different failure.
- The aborted requests log `ERR_INTERNET_DISCONNECTED` in the console; those are expected here and nowhere else.
- The queue replays after sign-in, when the browser comes back online and when the app returns to the front; unrouting fires none of those, so the last step reloads.
