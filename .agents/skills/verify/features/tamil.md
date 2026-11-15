# Tamil cards

What a card's language changes for Tamil: Lymi works each word's reading out from its spelling and draws it over the word in Latin letters, so most cards store no pronunciation; a pronunciation that only repeats that reading, even in chat spelling, is stored empty, and a loanword said against its spelling keeps its own; review draws the reading over the term on the cue while the card is New or Learning, waits for the reveal once it is Known, and fades an example's reading over a word written as a Known card's; the card form calls the field Reading.

## Reach

No persona has Tamil cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades a card Easy through `/api/review/grade` so it is Known, and reviews each deck at `/review?deck=<id>`.

## Drive

[`tamil.mjs`](tamil.mjs): add பாடல் with pāḍal, பஸ் with bas, and பாடல் again with paadal; review a New தமிழ் பாடல் and reveal it; review a New பேக் read bēg; review a Known வீடு and reveal it; review a New பள்ளி whose example holds a Known மரம் and the form மரத்தில், and reveal it; open Add a card in the first deck, type ஜன்னல், add its Reading field and type jannel.

## End state

பாடல் is stored with an empty pronunciation and `normalized` `pronunciation`, பஸ் keeps bas, and the second பாடல் is skipped. The New cue draws tamizh and pāḍal over the two words in the Tamil face (`:lang(ta)`, Tamil Sangam MN first), before and after the reveal. பேக் draws bēg. The Known வீடு draws nothing until the reveal, then vīḍu. பள்ளி's example draws paḷḷiyil, oru, uḷḷadu, marattil and paravai, and nothing over மரம். Add a card offers a Reading chip; the preview draws jannal over ஜன்னல், then jannel once it is typed.

## Gotchas

- The hidden copy that sizes the card holds the answer before the reveal, so read only visible `rt` outside `[aria-hidden]`.
- Duplicates compare the term across the learner's decks, so each review deck uses a term no other step added.
- Grade a Known card that gives its pair Easy a day ago, so it is not due and stays out of the review.
