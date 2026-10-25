# Polish cards

What a card's language changes for Polish: stress falls on the second-to-last syllable, so only a word that breaks the rule has a pronunciation, the term with U+0300, a grave, over the stressed vowel; review underlines that syllable on the cue while the card is New or Learning, draws the plain term once it is Known, and underlines it again after the reveal; an acute typed over a vowel Polish never writes with one becomes the grave, while ó stays a letter; and the card form calls the field Stress.

## Reach

No persona has Polish cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades one card Easy forty days ago through `/api/review/grade` so it is Known and due, and reviews each deck at `/review?deck=<id>`.

## Drive

[`polish.mjs`](polish.mjs): add muzyka stressed mùzyka, matematyka stressed with an acute, matemátyka, and żółw with no pronunciation, then żółw again; review a New polityka stressed polìtyka in a deck of its own and reveal it; review a Known fizyka stressed fìzyka and reveal it; open Add a card in the first deck, type muzyka, add its Stress field and type mùzyka, then the typo mzùyka.

## End state

muzyka keeps mùzyka; matematyka is stored stressed matemàtyka with `normalized` `pronunciation`; żółw is added with its ó and the second żółw is skipped. The New cue reads polityka with li underlined, before and after the reveal, and no visible line repeats polìtyka. The Known cue reads fizyka with nothing underlined before the reveal and fi underlined after it. Add a card offers a Stress chip whose field is a textbox named Stress; mùzyka previews with mu underlined and no hint, and mzùyka shows the hint that review shows the stress only when it's the term with a mark added, as in mùzyka.

## Gotchas

- U+0300 is a combining mark, so compare text exactly.
- The hidden copy that sizes the card holds the answer before the reveal, so read only visible lines.
- Each review deck holds one card so the review opens on it, and a word of its own, since a term in any deck is a duplicate.
