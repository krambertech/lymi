# Import from Quizlet

A learner pastes a set they made in Quizlet, or chooses a .txt file of it. Lymi detects the separators, previews the cards and carries on into the import's questions.

## Reach

Settings › **Import** › **Quizlet**, or `/import/quizlet`.

## Drive

[`import-quizlet.mjs`](import-quizlet.mjs), as `learner`: press **Continue** with nothing pasted, then on text with no cards, then paste a tab-separated set and continue.

## End state

The empty press shows **Paste your set’s text or choose a .txt file first.** and moves the caret to the text. Text with no cards shows **No cards found in this text. Check the separators.** A readable set leaves the page for the import's questions or its Ready screen.

## Gotchas

- `e2e/import-from-quizlet.spec.ts` covers the import to its end. This recipe stops once the upload is accepted.
