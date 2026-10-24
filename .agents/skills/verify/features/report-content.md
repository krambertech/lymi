# Report a shared deck or card

A learner reports a deck or card someone else wrote. One sheet takes a reason and an optional note; a sent report closes with a toast, and Lymi gets an email at hello@lymi.app at once. The owner never sees Report on their own deck.

## Reach

In a deck someone else owns: the deck page's **Deck options** › **Report deck**, About this deck's **Report deck**, and on a card, **Card options** › **Report card** in the card's view and in review after the reveal. On a join page, signed in and not yet a member: **Report this deck**.

## Drive

[`report-content.mjs`](report-content.mjs), as `learner` on Noor's **Lisboa a dois**: report the deck with a reason and a note, then report its first card, and read the email the local outbox kept.

## End state

The toast says **Report sent. We’ll look within a day.**, the outbox holds an email to hello@lymi.app whose subject names the reason and the card's term, and Kateryna's own **Lezione 12** offers no Report in its menu.

## Gotchas

- Reporting the same thing again while its report is open sends nothing new, so a rerun without `reset=1` finds no second email.
- `pnpm moderate` settles reports against a local server with `LYMI_API_ORIGIN=http://localhost:<port>` and a key made on an account in `OPERATOR_EMAILS`.
