# Readwise

Readwise sends the learner's book highlights to Lymi, which follows the books in a language one of their decks teaches and turns new highlights into cards every hour or on **Check now**.

## Reach

Settings, **Apps**, the **Readwise** chip (or its row once connected), which opens `/settings/readwise`.

## Drive

[`readwise.mjs`](readwise.mjs), as `learner` from Settings: open **Readwise**, paste the fake token `lymi-dev-readwise-0000` into **Readwise token** and press **Connect**. Choose Italian for *Una stagione a Torino*, press **Check now**, then open **Everything Readwise did, in Activity**, go back, disconnect through **Stop** with the request blocked, then reload and disconnect with it let through.

## End state

The page says **Connected** and lists the fake's three books. After **Check now**, Activity on the page reads "Added 3 cards to Casa" and the header says one passage had no word in its note; `/api/cards?deckId=<Casa>` holds the three new cards with the book as their source. The Activity link opens `/activity?app=readwise` with only Readwise's rows and **Show everything**. With the request blocked, **Disconnect Readwise** says Lymi could not be reached in a toast and Readwise stays connected. Let through, it returns to Settings with "Readwise is disconnected", and the three cards stay.

## Gotchas

- The fake answers only on a loopback or preview server ([local-dev](../../../../docs/local-dev.md#connect-readwise-without-an-account)).
- A book's language comes from the AI, so locally every book starts unplaced and the recipe picks Italian by hand.
- Disconnect asks once more: the first **Disconnect Readwise** shows **Stay connected** beside a second one, and the recipe reloads after the failed one, whose toast covers the button at 393 px.
