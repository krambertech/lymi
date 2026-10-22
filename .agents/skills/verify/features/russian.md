# Russian cards

What a card's language changes for Russian: the term stays as natives write it and the pronunciation is the term with U+0301 over the stressed vowel; review draws that marked form in place of the term on the cue while the card is New or Learning, the plain term once it is Known, and the marks after the reveal; the duplicate rule keeps two stresses of one term apart; search ignores the mark; and the card form calls the field Stress.

## Reach

No persona has Russian cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades one card Easy forty days ago through `/api/review/grade` so it is Known and due, and reviews each deck at `/review?deck=<id>`.

## Drive

[`russian.mjs`](russian.mjs): add замок stressed за́мок, stressed замóк with a Latin ó, unstressed, and in IPA; add the terms пла́чу, плачу́ and плачу as sent, with their stress in the term; search for за́мок; review a New мука stressed мука́ and reveal it; review a Known мука stressed му́ка and reveal it; open Add a card in the first deck, type мука, add its Stress field and type мука́, then the typo мкуа́.

## End state

за́мок and замо́к are added, the second stored with a Cyrillic о and U+0301 and `normalized` `pronunciation`, and the unmarked and IPA adds are skipped. пла́чу is stored as the term плачу, keyed плачу, with the pronunciation пла́чу and `normalized` `term` and `pronunciation`; плачу́ is a second card and плачу is skipped, and `term=пла́чу` finds both. The search returns both cards. The New cue reads мука́ before and after the reveal with no second visible line repeating it. The Known cue reads мука before the reveal and му́ка after it. Add a card offers a Stress chip whose field is a textbox named Stress; мука́ previews in place with no hint, and мкуа́ shows the hint that review shows the stress only when it's the term with a mark added.

## Gotchas

- U+0301 is a combining mark, so compare text exactly; `getByText` with `exact` matches the marked and plain forms apart.
- The hidden copy that sizes the card holds the answer before the reveal, so read only visible lines.
- Each review deck holds one card so the review opens on it.
