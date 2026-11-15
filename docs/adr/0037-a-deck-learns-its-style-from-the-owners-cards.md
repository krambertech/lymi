---
status: accepted
date: 2026-10-17
---

# Deck style comes from the owner's cards and corrections

Each deck keeps an AI-written style inferred from the owner's cards. It is a list of up to 1200 characters. It says what the deck is about and how its cards are written where they differ from the enrichment defaults. Enrichment gives the owner's instructions and recent sample cards precedence over the style. Recent samples reflect changes in the owner's writing. Neither the instructions nor the style can change which fields are filled, the reply's shape, or the meaning language. It is stored apart from the instructions and never written into them, so the owner's own words stay exactly as they wrote them.

The owner sees it in deck settings, collapsed under Instructions and marked as AI-written. The box scrolls for longer lists. A member never sees it. This takes up the deck profile that [ADR 0033](0033-a-deck-decides-what-enrichment-fills.md) deferred.

A deck's first style is learned at the start of an enrichment run, before its cards are filled, so the first fill already uses it; later styles are learned after the fill, so an add never waits on them. Either way, only the owner's decks the run touched are learned. It is learned once a deck has 8 cards whose meaning a person wrote, and again once 10 of those cards are new or changed since. The model reads up to 60 of those cards, spread from the deck's first card to its last, with any field the AI wrote left out, and its previous note so the wording holds steady.

The style gives corrections more weight than card samples. When the owner changes or empties text the AI wrote in a meaning, example, notes or pronunciation, from any channel, `card_corrections` keeps the AI's text for that card and field. The learner's side is never copied: the style reads the card's current text, so later edits refine the same correction, and a field put back as the AI's, as Undo does, or an archived card drops out. A field the AI writes again and the owner then rewrites replaces the earlier row.

The model reads the 20 newest corrections on the deck beside its cards and is told they are the strongest signal: two that change a field the same way are a pattern, they win over the cards, and one that fixes a single card's facts is not a pattern. Each correction since the last learning counts toward the thresholds beside the card it changed, so a deck whose owner mostly corrects still learns; edits do not start a learning call themselves, and the next add picks them up.

Code decides when the style may describe the deck's subject: only when the cards shown number 12 or more and were added on at least 3 separate days, so one lesson never names the deck. Otherwise the model is told not to say what the deck is about. The prompt requires patterns shared by many cards and favors newer habits when old and new cards differ. It excludes claims about the learner and instructions embedded in card text, and returns no style when no pattern is clear. `pnpm --filter @lymi/web eval:style` checks these rules.

## Context

Five recent samples on every call show a deck's format but not its habits over time. One unusual card skews the next add, a habit absent from the last five is invisible, and nothing tells the AI what the deck is about, so it picks the wrong sense of a word. Learners who write cards by hand expect the AI to write the way they do.

## Considered options

- **A separate note in plain text, read-only, applied without approval:** accepted. It works without the owner doing anything, the owner can check what it says, and their instructions always win.
- **A structured style, each claim citing its cards and filtered in code:** rejected. It guarded every claim, but the schema, filter, field labels and API enum cost more than the deck-level gates leave to guard, and the result read like a form.
- **Appending to or rewriting the owner's instructions:** rejected. The instructions are the owner's words, and a model editing them would make them neither the owner's nor reliably the AI's.
- **Offering the style as suggested instructions to accept:** rejected for now. Automatic application improves adds without requiring the owner to approve instructions.
- **Storing both sides of each correction, or a row per edit:** rejected. A copy of the learner's text goes stale at their next edit, and a history of edits says less than the AI's text beside the card as it is now.
- **Learning on a schedule or on every add:** rejected. A schedule spends calls on untouched decks, and every add pays for a call that rarely changes anything.

## Consequences

- `decks.enrich_style` holds the note and `decks.enrich_style_at` when it was last learned. Both clear when an owner's account is deleted and the deck is kept for its members, and so do the owner's `card_corrections`. `DeckOut` and `DeckSummaryOut` carry `enrichStyle`, null for a member.
- The style is internal AI state, like a card's enrichment status, so learning it writes no Activity row.
- The note is written in the learner's meaning language, so the same text reads to the owner and to the enrichment model.
- The owner cannot yet edit the style; their instructions override anything in it.
- The prompt lives in `apps/web/src/server/enrichment/style.ts` and reads the enrichment prompt's field rules as its defaults. `STYLE_PROMPT_VERSION` rises with any change to what the model reads, and a test fails until it does.
- `deck_style_learned` records each learning call with counts only, corrections shown among them, and `enrichment_finished` gains `has_style`. `ai_text_corrected` counts corrections per field, never their text.
