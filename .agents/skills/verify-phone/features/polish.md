# Polish

A Polish card whose pronunciation is its term with a grave over the stressed vowel, a word that breaks the second-to-last-syllable rule, draws its stressed syllable underlined: on the cue while the card is New or Learning and always after the reveal, the same rule as [ukrainian.md](ukrainian.md)'s marks. The card page calls the field Stress.

## Reach

No persona has Polish cards, so [`polish.mjs`](polish.mjs) adds to `learner` a Polski deck holding muzyka stressed múzyka, typed with an acute; the flow opens it from Library and presses its **Review**.

## Drive

[`polish.yaml`](polish.yaml): review muzyka, check its label reads the stress and the meaning is not on screen, tap low on the card to reveal it, end review, and open the card from the deck.

## End state

The cue draws muzyka with mu underlined in amber; the card's label reads "Recognition card for muzyka, read mùzyka"; after the reveal the grades and the meaning show with the underline still on the term; the card page names its field Stress. The check reads the card back with its acute stored as a grave, mùzyka.

## Gotchas

- Before the reveal the card is one button whose label says the term and its stress, so the flow matches the stress inside that label; the underline itself shows only in the screenshots.
- A Known card would draw the plain term until the reveal; the seeded card is New, so this flow checks the New side only, and [the web's Polish feature](../../verify/features/polish.md) checks the Known side.
