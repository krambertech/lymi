# Import and export

Import brings decks in from another app, one page per app, then one import screen that follows the import from its upload to its end; export writes a deck or the library to a file the learner saves or shares from iOS's share sheet ([ADR 0036](../../../../docs/adr/0036-setup-runs-on-the-phone.md), [imports.md](../../../../docs/design/imports.md)).

## Reach

**You**, then **Import** or **Export library** under Your data. Library's plus menu has **Import decks**, a deck's ⋯ has **Export deck**, and an import or export in **Activity** opens the same screen or sheet.

## Drive

[`import-export.yaml`](import-export.yaml), as `learner`: open **Import**, choose **Quizlet**, type a three-card set separated by commas and semicolons, name the set, continue, answer the preview's questions and import; then open **Export library**, tap **Anki package**, wait for **Save or share** and tap it, which opens iOS's share sheet.

## End state

The learner has three more cards, in a new deck named for the set, and one finished Anki export, which [`import-export.mjs`](import-export.mjs) reads from `/api/dev/state` and `/api/activity`.

## Gotchas

- iOS's Files picker runs outside the app, so the flow drives Quizlet's paste box rather than **Choose file**; the upload, preview and writing are the same for every app.
- The import is written by the local Worker's Workflow, so the flow allows the done screen 90 seconds to arrive.
- The share sheet is iOS's own, so the flow only waits for it and closes it with a swipe down.
