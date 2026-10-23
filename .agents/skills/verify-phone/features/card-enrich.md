# Enrich a card

The deck's owner asks the AI to fill a card's empty fields from the card page's ⋯, the card's long-press menu, or its menu in a review. The card comes back working: the page shimmers each field the AI will write, VoiceOver hears **Enriching this card**, and the text lands without a reload. A run that fails leaves **Couldn’t enrich this card.** with **Try again** under the fields; a request that fails says **Couldn’t enrich “term”. Check your connection and try again.** in a toast with **Retry**. Enrich shows only while a field the deck lets the AI fill is empty and no run is filling it ([phone.md](../../../../docs/design/system/phone.md), [library-decks-and-cards.md](../../../../docs/design/library-decks-and-cards.md)).

## Reach

⋯ on a card's page, a long press on a card on its deck's page or in search, or a hold on a revealed card in a review.

## Drive

[`card-enrich.yaml`](card-enrich.yaml), as `learner`: the setup clears the example of two cards in Lezione 12. On the first card's page, open **Card options**, see **Enrich**, take it, and see the request's toast. On the deck's page, hold the second card, see **Enrich** beside **Edit card**, and take it.

## End state

[`card-enrich.mjs`](card-enrich.mjs) reads both cards: still owned, examples still empty, neither stuck at `working`. A local Worker has no `OPENAI_API_KEY`, so the request answers 503 and the toast is the expected screen; with a key in `apps/web/.dev.vars` the cards go to `working` and the page shimmers instead.

## Gotchas

- Without a vendor key no run starts, so the shimmer, the landing and the review's update are seen by putting a card at `working` in the local D1 (`pnpm --filter @lymi/web exec wrangler d1 execute DB --local --command "update cards set enrichment_status = 'working', enrichment_fields = '[\"example\"]', updated_at = <now ms> where id = '<card>'"`), then writing the example with `enrichment_status = null`, or setting `'failed'` for the failed line; the deck's poll lands either within two seconds.
- The review's card menu is a native sheet Maestro's hierarchy leaves out, so Enrich there is driven by hand from a screenshot rather than by this flow.
