# Welcome for a Japanese beginner

A learner who answers A language, then Japanese, is offered the decks a beginner starts from, in the order to take them: Read Japanese Kana, JLPT N5, JLPT N4, then Japanese Essentials. `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them by slug, and a missing one leaves its place to the shelf's next deck in Explore's order.

## Reach

`fresh` from `/welcome`, once the `publisher` persona has published its small Japanese decks under production's slugs. Its seed publishes them in production's order, with Japanese Essentials first, so the offer is reordered rather than already in order.

## Drive

[`welcome-japanese.mjs`](welcome-japanese.mjs): seed `publisher`, sign in again as `fresh`, then **Continue**, **A language**, **Japanese**, **Continue** past the daily goal, read the ready-made decks, pick Read Japanese Kana and press **Add and review**.

## End state

The **Ready-made decks** group holds four decks in the order above. After **Add and review** the page is the review, Read Japanese Kana is in `/api/decks`, and `/api/settings` has `learningLanguage` `ja`.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.
- Core Japanese Words is published too and must not be offered: it is fifth in Explore's order once the beginner decks lead.
