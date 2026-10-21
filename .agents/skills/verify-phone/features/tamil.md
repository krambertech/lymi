# Tamil

A Tamil card's reading is worked out from each word's spelling and drawn over the word in Latin letters, on the cue while the card is New or Learning and always after the reveal, the same rule as [chinese.md](chinese.md)'s pinyin. A card whose pronunciation holds its own reading, for a loanword said against its spelling, draws that instead. An example's reading fades over a word written as one of the learner's Known words.

## Reach

No persona has Tamil cards, so [`tamil.mjs`](tamil.mjs) adds to `learner` a தமிழ் deck holding தமிழ் பாடல் with no pronunciation, a பேக் deck holding பேக் read bēg, a மரம் deck whose மரம் is graded Easy yesterday so it is Known and not due, and a பள்ளி deck holding a New பள்ளி with the example `பள்ளியில் ஒரு மரம் உள்ளது, மரத்தில் பறவை.`; the flow opens each from Library and presses its **Review**.

## Drive

[`tamil.yaml`](tamil.yaml): review தமிழ் பாடல், check its label names the term and the meaning is not on screen, and tap low on the card to reveal it; end review, then review பேக்; end review, then review பள்ளி and reveal it.

## End state

Before the reveal the card's label reads "Recognition card for தமிழ் பாடல். Tap to reveal", with no empty "read", and `01-new-cue-reading` shows tamizh over தமிழ் and pāḍal over பாடல் in the Tamil face; after it, the grades and the meaning show with the readings still over the term. பேக்'s label reads "Recognition card for பேக், read bēg" and `03-loanword-own-reading` shows bēg over it. `04-example-reading-fades` shows paḷḷiyil, oru, uḷḷadu, marattil and paravai over the example and nothing over மரம். The check reads the cards back, தமிழ் பாடல் with an empty pronunciation and பேக் with bēg.

## Gotchas

- Before the reveal the card is one button whose label says the term, and its own reading when it has one; VoiceOver reads the Tamil script, not the reading drawn over it.
- A Known card would hide the reading until the reveal; the reviewed cards are New, so this flow checks the New side only, and [the web's Tamil feature](../../verify/features/tamil.md) checks the Known side.
