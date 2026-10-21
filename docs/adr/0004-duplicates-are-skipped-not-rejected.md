---
status: accepted
date: 2026-09-05
---

# A duplicate is the same term in the same language anywhere, and adding one is skipped

A duplicate is a card whose normalised term (trimmed, case-folded, accents kept but for Russian and Ukrainian stress) and language (by primary subtag, so `ja` and `ja-JP` match) match an active card anywhere in the learner's decks, not only the target deck. Adding one is not an error. The add returns per-card outcomes, a duplicate is reported as skipped with the existing card's id, and the rest of the batch goes through. A card with no language matches only other cards with no language. In Japanese, where a written term can be two words, the kana reading counts too: when both cards have one that fits the term and they differ after folding katakana to hiragana and collapsing spaces, they are not duplicates, so 上手 read じょうず and 上手 read うわて are two cards. When either card has no reading, term and language decide as before, which keeps a repeated add without a reading idempotent. In Chinese the pinyin counts the same way once folded to NFC, lower case and tone marks without spaces or punctuation, so 行 háng and 行 xíng are two cards while xue2 xi2 and Xué xí. are one reading. 一 and 不 compare without their tone, which dictionaries write in citation form and learners often as spoken, so 不是 bù shì and bú shì are one card; pinyin with no tone mark counts as no reading. In Russian the stress counts the same way: when both cards' pronunciations are the term with U+0301 added, or with ё restored where the term writes е, and they differ in lower case, they are two cards, so замок stressed за́мок and замо́к stay apart; an acute over ё or over a one-syllable word does not count, and an unmarked or IPA pronunciation counts as no reading. Other reading languages are left out until their readings have one spelling.

Russian stress is the one accent the term key drops (amended 2026-10-20). Learners mark it with U+0301, as in за́мок, though natives never write it, so a Russian card's term key removes U+0301 after NFC, and a stressed term sent with no different pronunciation is stored plain with its stress as the pronunciation; за́мок and замо́к then stay apart by the rule above, and an unstressed add matches either. The fold belongs to the language's record, never to `normaliseTerm`: NFC keeps U+0301 on letters with no precomposed form, such as Lithuanian ą́, so no other language changes. The phone and the server fold together, behind a raised minimum phone version. Cards stored before the fold were rewritten by a system backfill that moved the stress into an empty pronunciation first; a card beside another pronunciation, such as IPA, keeps its stressed key until it is edited, and two cards that became duplicates both stayed. Ukrainian follows the same rule, and its term key also writes ’, ‘, ʼ and ` as ', so м’ясо and м'ясо are one term (amended 2026-10-21); the same backfill rekeyed Ukrainian terms written with them and left the terms as written.

For an account on `PUBLISHER_EMAILS`, a duplicate is the same term in the target deck only, on every add path: the app, the API and MCP. Each published deck has to stand alone, so a publisher's term repeats across its own decks. Learners keep the rule above. `publisherOverlap=true` on the batch API was once the opt-in; it is still accepted, and still answers 403 for anyone else.

## Considered options

- Same deck only. Rejected: "sbrigarsi" in two Italian decks is one word already known, and the cross-deck index on user and term already exists.
- Reject the batch with 409. Rejected: MCP clients retry, and one repeated term would fail a whole lesson.
- Add anyway, flagged, merge later in Activity. Rejected: creates the second lifecycle ADR 0001 avoided.

## Consequences

- Re-running the same `add_cards` call is safe. Idempotency comes from the rule, not from client-supplied keys.
- Moving a duplicate to another deck is an edit on the existing card, not a new add.
- The rule has to be applied on the single-card path too, so the web sheet reports "already in Italian A2" rather than adding a second copy.
