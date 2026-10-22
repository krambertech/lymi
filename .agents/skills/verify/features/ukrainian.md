# Ukrainian cards

What a card's language changes for Ukrainian: the term stays as natives write it and the pronunciation is the term with U+0301 over the stressed vowel; review draws that marked form in place of the term on the cue while the card is New or Learning, the plain term once it is Known, and the marks after the reveal; the duplicate rule keeps two stresses of one term apart; a typographic and a typewriter apostrophe are one letter; search ignores the mark; and the card form calls the field Stress. Nothing restores a letter, since ї's dots are part of the letter.

## Reach

No persona has Ukrainian cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades one card Easy forty days ago through `/api/review/grade` so it is Known and due, and reviews each deck at `/review?deck=<id>`.

## Drive

[`ukrainian.mjs`](ukrainian.mjs): add замок stressed за́мок, stressed замóк with a Latin ó, unstressed, and in IPA, and м’ясо with a typographic apostrophe stressed м'я́со; search for за́мок; review a New руки stressed руки́ and reveal it; review a Known руки stressed ру́ки and reveal it; open Add a card in the first deck, type дорога, add its Stress field and type доро́га, then the typo дорго́а.

## End state

за́мок and замо́к are added, the second stored with a Cyrillic о and U+0301 and `normalized` `pronunciation`, the unmarked and IPA adds are skipped, and м’ясо is added. The search returns both замок cards. The New cue reads руки́ before and after the reveal with no second visible line repeating it. The Known cue reads руки before the reveal and ру́ки after it. Add a card offers a Stress chip whose field is a textbox named Stress; доро́га previews in place with no hint, and дорго́а shows the hint that review shows the stress only when it's the term with a mark added.

## Gotchas

- U+0301 is a combining mark, so compare text exactly; `getByText` with `exact` matches the marked and plain forms apart.
- The hidden copy that sizes the card holds the answer before the reveal, so read only visible lines.
- Each review deck holds one card so the review opens on it.
