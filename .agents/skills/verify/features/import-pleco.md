# Import from Pleco

A Pleco flashcard text export brought into Lymi: the preview names the categories that become tags, the card step says how to learn traditional characters, and the import makes one Chinese deck with each category as a tag.

## Reach

**Settings**, then **Pleco** under importing from another app; or `/import/pleco`.

## Drive

[`import-pleco.mjs`](import-pleco.mjs), as `learner` from Settings, with the invented export at `apps/web/src/server/imports/pleco/fixtures/both.txt`: **Choose file**, check the card step's hint and **Looks right**, check the summary's categories line, then **Import** and read the stored cards.

## End state

**Imported N cards** shows, Library lists **Pleco flashcards**, the deck's language is `zh`, 学习 carries the tags **HSK 1/Verbs** and **HSK 1** with 學習 in its notes, and Activity has a row for the Pleco import.

## Gotchas

- The file has 9 distinct cards. 东西 and 行 each come twice with different pinyin: before Chinese reading keys ship they are duplicates of each other, so the summary says 7; after, it says 9. The recipe reads the number from the screen.
- A Pleco export and a Quizlet set are both `.txt`; the file's content decides, so a non-Pleco `.txt` chosen here imports as Quizlet.
- Parsing runs in the import Workflow; allow 30 seconds for the preview and 60 for the import to finish.
