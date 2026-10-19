---
status: accepted
date: 2026-09-05
---

# A duplicate is the same term in the same language anywhere, and adding one is skipped

A duplicate is a card whose normalised term (trimmed, case-folded, accents kept) and language (by primary subtag, so `ja` and `ja-JP` match) match an active card anywhere in the learner's decks, not only the target deck. Adding one is not an error. The add returns per-card outcomes, a duplicate is reported as skipped with the existing card's id, and the rest of the batch goes through. A card with no language matches only other cards with no language. In Japanese, where a written term can be two words, the kana reading counts too: when both cards have one that fits the term and they differ after folding katakana to hiragana and collapsing spaces, they are not duplicates, so 上手 read じょうず and 上手 read うわて are two cards. When either card has no reading, term and language decide as before, which keeps a repeated add without a reading idempotent. In Chinese the pinyin counts the same way once folded to NFC, lower case and tone marks without spaces or apostrophes, so 行 háng and 行 xíng are two cards while xue2 xi2 and Xué xí are one reading; pinyin with no tone mark counts as no reading. Other reading languages are left out until their readings have one spelling.

For an account on `PUBLISHER_EMAILS`, a duplicate is the same term in the target deck only, on every add path: the app, the API and MCP. Each published deck has to stand alone, so a publisher's term repeats across its own decks. Learners keep the rule above. `publisherOverlap=true` on the batch API was once the opt-in; it is still accepted, and still answers 403 for anyone else.

## Considered options

- Same deck only. Rejected: "sbrigarsi" in two Italian decks is one word already known, and the cross-deck index on user and term already exists.
- Reject the batch with 409. Rejected: MCP clients retry, and one repeated term would fail a whole lesson.
- Add anyway, flagged, merge later in Activity. Rejected: creates the second lifecycle ADR 0001 avoided.

## Consequences

- Re-running the same `add_cards` call is safe. Idempotency comes from the rule, not from client-supplied keys.
- Moving a duplicate to another deck is an edit on the existing card, not a new add.
- The rule has to be applied on the single-card path too, so the web sheet reports "already in Italian A2" rather than adding a second copy.
