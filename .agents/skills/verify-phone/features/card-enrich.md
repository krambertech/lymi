# Enrich a card

The deck's owner asks the AI to fill a card's empty fields from **Card options** on the card's page, the only place the phone offers it. Without the learner's yes to AI services, Enrich first shows the AI ask; Not now leaves the card alone. The card comes back working: the page shimmers each field the AI will write, VoiceOver hears **Enriching this card**, and the text lands without a reload. A run that fails leaves **Couldn’t enrich this card.** with **Try again** under the fields; a request that fails says **Couldn’t enrich “term”. Check your connection and try again.** in a toast with **Retry**. Enrich shows only while a field the deck lets the AI fill is empty and no run is filling it ([phone.md](../../../../docs/design/system/phone.md), [library-decks-and-cards.md](../../../../docs/design/library-decks-and-cards.md)).

## Reach

⋯ on a card's page.

## Drive

[`card-enrich.yaml`](card-enrich.yaml), as `learner`: the setup clears the example of a card in Lezione 12 and turns AI services on. On its page, open **Card options**, see **Enrich**, take it, and see the request's toast. Then hold the card on its deck's page and see the long-press menu without **Enrich**.

## End state

[`card-enrich.mjs`](card-enrich.mjs) reads the card: still in its deck, example still empty, not stuck at `working`. A local Worker has no `OPENAI_API_KEY`, so the request answers 503 and the toast is the expected screen; with a key in `apps/web/.dev.vars` the card goes to `working` and the page shimmers instead.

## Gotchas

- Without a vendor key no run starts, so the shimmer and the landing are seen by putting a card at `working` in the local D1 (`pnpm --filter @lymi/web exec wrangler d1 execute DB --local --command "update cards set enrichment_status = 'working', enrichment_fields = '[\"example\"]', updated_at = <now ms> where id = '<card>'"`), then writing the example with `enrichment_status = null`, or setting `'failed'` for the failed line. The page polls only while its list holds a working card, so reopen it from the deck after the first update.
- The AI ask is a native sheet; the setup answers yes through `PUT /api/settings/ai-consent` so the flow reaches the request, and the ask itself is seen by hand with the answer unset.
