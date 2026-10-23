---
status: accepted
date: 2026-10-23
decision: "Every highlight through Smart add's reader; books in a learned language; hourly pull; rely on Readwise for Kindle"
---

# Cards from Readwise highlights

A learner who reads in the language they are learning gets cards from what they mark while reading, without copying anything by hand. They paste their Readwise token into Settings once. From then on, Lymi pulls new highlights from the books they read in a language they learn, picks the term in each, and adds an ordinary card with the passage as its example. Activity lists every pull, so a wrong card is one archive away.

Readwise is the one connection that reaches Kindle (its phone app included), Kobo, Apple Books, Readwise Reader and Snipd. Kateryna accepted these decisions on 23 October 2026.

## What Readwise gives us

Read on 23 October 2026 from [the API docs](https://readwise.io/api_deets), [the webhook docs](https://docs.readwise.io/readwise/docs/webhooks) and Readwise's help pages.

- **A personal token is the only way in.** The learner copies it from `readwise.io/access_token`. `GET /api/v2/auth/` answers 204 for a valid one. There is no OAuth for third parties.
- **`GET /api/v2/export/` returns books with their highlights**, paged by `pageCursor`, filtered by `updatedAfter` and book `ids`. A book has `title`, `author` and `source`. A highlight has `text`, `note`, `tags`, `highlighted_at` and `is_deleted`. It has no tag filter, so following a tag means reading every new highlight.
- **Lists allow 20 calls a minute per token**, with `Retry-After` on a 429. An incremental pull is usually one call.
- **Webhooks exist but are manual.** The learner creates one at `readwise.io/webhook`, and the only highlight event is `readwise.highlight.created`. No API registers one.
- **Inline tags work on e-readers.** A Kindle or Kobo note that starts with `.lymi` becomes the tag `lymi` when it reaches Readwise.
- **Reader's Quick Lookup saves a word.** Long-pressing a word, choosing Define and tapping save adds it to Readwise highlights. What that highlight holds (the word alone, or the word with its sentence or definition) is unconfirmed until we read a real export.
- **Kindle reaches Readwise through `read.amazon.com/notebook`**, read by Readwise's desktop browser extension. Personal documents sent to a Kindle never appear there.
- **Readwise has no free plan.** It has a 30-day trial, then a paid subscription. Whether the Lite plan's token reaches the API is unconfirmed.

## Decisions

### How a highlight becomes a card

A highlight is sometimes a word and usually a passage, so something has to pick the term. Smart add already does this for a lesson. Lymi's model reads the material and returns the terms worth a card in that deck.

**Every highlight goes through Smart add's reader.**

- A short highlight, up to four words, names its term. The reader only puts it in the deck's form, such as a dictionary form when the deck's cards use one.
- A note that names a word overrides the reader. Text left after removing `.tags` is taken as the term.
- A passage gets at most two terms, chosen against the deck's cards and the learner's Known cards. When the decision model is unsure, the passage adds nothing and counts as skipped.

The alternative is to bring in only short highlights and highlights whose note names the term, with no model choosing anything. It is predictable, but it asks for exactly the manual step this feature exists to remove.

**The word is "extract", now in `CONTEXT.md`.** It is not enrichment, which fills fields on a card that already exists, and it is not a suggestion, because nothing waits to be accepted ([ADR 0001](../adr/0001-integration-cards-are-ordinary-cards.md)). ADR 0002 already says "extracts". A **Highlight** entry, for what the learner marked while reading, joins it when slice 1 ships.

### Which highlights come in

**Books in a language the learner is learning come in.** At connect, Lymi reads the learner's Readwise books, finds each book's language from its highlights, and lists the ones in a language one of their decks teaches, already ticked. Lymi follows a new book in that language on its own and adds it to the list, where the learner can switch it off. Highlights in other languages never come in.

The alternatives are a tag (`.lymi` on a Kindle note, `lymi` in Reader), which is precise but means a step on every highlight, and books picked by hand, which means a trip to Lymi with every new book. Kindle's own notes are slow to type, which is the argument against a tag.

### Where the cards land

**Cards land in one deck per language, chosen at connect.** The default is the learner's most recent deck in that language. The card's `source` holds the book, as "Tõde ja õigus · A. H. Tammsaare", which is the field's documented use. A deck per book would make Library grow with every book.

### How often Lymi pulls

**Lymi pulls hourly, and Settings has Pull now.** The Worker's 15-minute cron picks connections due for a pull. Readwise itself syncs Kindle only a few times a day, so pulling more often buys nothing. A pull asks for highlights updated after the last pull and follows `pageCursor`. It waits out `Retry-After` on a 429.

At connect the learner chooses **From now on** (the default) or **Everything so far**, with the count shown first. Everything so far runs as an import does, in a Workflow, with progress.

A webhook could make pulls instant, but only if the learner creates it by hand in Readwise. It waits for demand.

### What Activity shows

**Activity keeps its row and adds the highlight count.** "Added 6 cards from 4 highlights to Estonian", with "Readwise · 07:15" under it. Writes from one caller in one deck on one day are already one row, so several pulls in a day stay one row, and the row expands to its cards with their passages. Enrichment adds its own row, "Enriched 6 cards in Estonian", as it does today.

Skipped highlights are not writes, so they stay out of Activity. The Readwise row in Settings carries the last pull instead: "Pulled at 07:15 · 4 highlights, 6 cards, 1 skipped".

### How a learner disconnects

**Disconnect sits on the Readwise row, with an inline confirm.** Lymi deletes the token and stops pulling. Cards it added stay, because they are ordinary cards, and Activity's rows still lead to them. The confirm says so: "Lymi forgets your Readwise token. Cards already added stay."

When Readwise refuses the token, pulls stop and the row says "Readwise no longer accepts this token" with **Paste a new token**. Lymi sends no email about it. `CONTEXT.md`'s Disconnect entry grows a sentence for Readwise, where Lymi forgets a token instead of revoking a grant.

### Whether Kindle needs Lymi's own route

**Lymi builds no browser extension and relies on Readwise.** Our own reader of `read.amazon.com/notebook` would run only in desktop Chrome or Firefox, break whenever Amazon changes the page, still miss personal documents, and add a store listing to maintain.

Kindle without Readwise belongs to the separate Mac proposal. A Kindle's `vocab.db` holds every word the learner looked up with the sentence it came from, which is closer to a card than any highlight. A `My Clippings.txt` import adapter is a cheap addition there, and it covers personal documents.

## The card

| Readwise | Card |
| --- | --- |
| Highlight text, or the extracted term | `term` |
| The sentence of the passage holding the term | `example`, field source `lesson` |
| Note, without its `.tags` | `notes`, field source `manual` |
| Book title and author | `source` |
| `readwise:<highlight id>:<n>` | `external_id`, so a pull never adds the same card twice |
| Empty | `meaning` and `pronunciation`, filled by enrichment in the meaning language |

A highlight edited or deleted after its card exists changes nothing, because the card is the learner's now. Lymi skips a duplicate by the rule of [ADR 0004](../adr/0004-duplicates-are-skipped-not-rejected.md).

Lymi keeps the token encrypted with a Worker secret and never returns it to a client. Audit rows name Readwise as the app behind the write. Extracting from a pull of 20 passages should cost under €0.01 at the Smart add bake-off's prices. `$ai_generation` records each call, and the cost falls under Smart add's entitlement once that is paid.

## Instrumentation

The product question is whether reading feeds review: of cards from highlights, how many are reviewed within a week and how many are archived. It reuses `cards_added` with `source: readwise` and adds `readwise_connected`, `readwise_disconnected` and a server `readwise_pulled` with counts of highlights, cards, skipped and duplicates, never text.

## Delivery

1. **Connect and pull words.** Settings row with paste, validation, the book list, deck per language, hourly pulls, Pull now, Activity rows and Disconnect. Only highlights of up to four words, taken as written. This serves Quick Lookup and single-word Kindle highlights with no model.
2. **Passages through the reader**, with the passage's sentence as the example and the skipped count.
3. **Everything so far** as a Workflow.
4. **The phone's Readwise row** under You.

## Later: Lymi as a Readwise export

Readwise has no self-serve partner programme, but it built exports for RemNote and Tana. Tana's is the one to copy. The learner pastes Tana's token into Readwise, and Readwise sends the highlights. Lymi's API keys fit that. Delivery should keep the highlight-to-card service behind a `POST /api/highlights` route that takes Readwise's highlight shape with an API key, so a pitch can point at a working endpoint.

## Open questions

- What a Quick Lookup save holds in the export. One real export from Kateryna's account settles it.
- Whether the Lite plan's token reaches the API.
- Whether a book's language detection should ask when a book mixes languages, or follow the majority.
