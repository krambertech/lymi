---
status: accepted
date: 2026-10-17
---

# A deck learns its style from the owner's cards

Each deck keeps a style: a list of as many points as help, at most 1200 characters, that the AI writes from the cards its owner wrote. It says what the deck is about and how its cards are written where they differ from the enrichment defaults. Enrichment reads it under the owner's instructions and the deck's samples: the samples are the newest cards, so where they differ from the style the learner has changed how they write. Neither the instructions nor the style can change which fields are filled, the reply's shape, or the meaning language. It is stored apart from the instructions and never written into them, so the owner's own words stay exactly as they wrote them. The owner sees it in deck settings, closed under Instructions, marked as the AI's, and in a box that scrolls when the list runs long. A member never sees it. This takes up the deck profile that [ADR 0033](0033-a-deck-decides-what-enrichment-fills.md) deferred.

A deck's first style is learned at the start of an enrichment run, before its cards are filled, so the first fill already uses it; later styles are learned after the fill, so an add never waits on them. Either way, only the owner's decks the run touched are learned. It is learned once a deck has 8 cards whose meaning a person wrote, and again once 10 of those cards are new or changed since. The model reads up to 60 of those cards, spread from the deck's first card to its last, with any field the AI wrote left out, and its previous note so the wording holds steady.

Code decides when the deck may be named: only when the cards shown number 12 or more and were added on at least 3 separate days, so one lesson never names the deck. Otherwise the model is told not to say what the deck is about. Everything else rests on the prompt, which asks for patterns many cards share, the newer habit where old and new cards differ, nothing about the learner, no instructions taken from card text, and nothing at all when nothing stands out, and on `pnpm --filter @lymi/web eval:style`.

## Context

Five recent samples on every call show a deck's format but not its habits over time. One unusual card skews the next add, a habit absent from the last five is invisible, and nothing tells the AI what the deck is about, so it picks the wrong sense of a word. Learners who write cards by hand expect the AI to write the way they do.

## Considered options

- **A separate note in plain text, read-only, applied without approval:** accepted. It works without the owner doing anything, the owner can check what it says, and their instructions always win.
- **A structured style, each claim citing its cards and filtered in code:** rejected. It guarded every claim, but the schema, filter, field labels and API enum cost more than the deck-level gates leave to guard, and the result read like a form.
- **Appending to or rewriting the owner's instructions:** rejected. The instructions are the owner's words, and a model editing them would make them neither the owner's nor reliably the AI's.
- **Offering the style as suggested instructions to accept:** rejected for now. The point is that adds improve unasked, and a suggestion nobody accepts changes nothing.
- **Learning on a schedule or on every add:** rejected. A schedule spends calls on untouched decks, and every add pays for a call that rarely changes anything.

## Consequences

- `decks.enrich_style` holds the note and `decks.enrich_style_at` when it was last learned. Both clear when an owner's account is deleted and the deck is kept for its members. `DeckOut` and `DeckSummaryOut` carry `enrichStyle`, null for a member.
- The style is AI bookkeeping, like a card's enrichment status, so learning it writes no Activity row.
- The note is written in the learner's meaning language, so the same text reads to the owner and to the enrichment model.
- The owner cannot yet edit the style; their instructions override anything in it.
- The prompt lives in `apps/web/src/server/enrichment/style.ts` and reads the enrichment prompt's field rules as its defaults. `STYLE_PROMPT_VERSION` rises with any change to what the model reads, and a test fails until it does.
- `deck_style_learned` records each learning call with counts only, and `enrichment_finished` gains `has_style`.
