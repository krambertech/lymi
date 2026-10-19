# Import from Anki

One Anki package brought into Lymi: the learner picks the decks to keep, confirms each kind of card looks right, and imports. The import is listed in Activity, and archiving it there archives everything it added.

## Reach

**Settings**, then **Anki** under importing from another app; or `/import/anki`.

## Drive

[`import.mjs`](import.mjs), as `learner` from Settings, with the repository's real export at `apps/web/src/server/imports/anki/fixtures/current.apkg`: **Choose file**, **Continue** with every deck, then back to leave one deck out while the preview request is dropped, so the card step shows the error with **Try again**, which brings the card back. Then every deck again, **Looks right** for each kind of card, and **Import 9 cards**.

## End state

**Imported 9 cards** shows, `/api/dev/state` counts 8 more active cards and more reviews than the seed, Library lists **Italian / Lesson 1**, and Activity has a row for the Anki import.

## Gotchas

- The file holds 10 cards; the learner already has one of them, so the last screen says 9, and its suspended card arrives archived, so 8 are active.
- Parsing runs in the import Workflow; allow 30 seconds for the deck choice and 60 for the import to finish.
- The site's local server and the product writing to one D1 can fail with `SQLITE_BUSY`; stop the site server before importing.
- Settings asks `/api/push/config`, which answers 503 without `VAPID_PUBLIC_KEY`. A local server and an app preview have none, so the error is expected there and a finding only in production.
