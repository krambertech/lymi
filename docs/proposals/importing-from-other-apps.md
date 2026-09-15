---
status: exploration
date: 2026-09-15
decision: none
---

# Importing from Anki, Mochi and spreadsheets

A learner who already keeps vocabulary in Anki, Mochi, Quizlet or a spreadsheet should be able to bring it into Lymi without losing cards, organisation, pictures or years of review history. This explores what a genuinely good import takes. It does not decide which sources ship first, where parsing runs, or whether imported history counts toward the streak. The format facts are in [docs/import-formats.md](../import-formats.md).

## Why it matters

Import is the first thing a switcher does, and [the market proposal](market-differentiation-and-go-to-market.md) lists it as required. Every competitor imports text; only Mochi, RemNote and Noji carry review history across, and none into a calm, fixed-field card. Progress is the one thing a learner cannot rebuild by hand, so it is where Lymi can be visibly better.

## What "really good" means

- **Cards look like Lymi cards.** Term, meaning, example, pronunciation and notes land in the right fields: HTML reduced to text, furigana as pronunciation, a cloze sentence as term plus example. Imported text is labelled `manual`, never `lesson` or `ai`.
- **Nothing silently disappears.** Before anything is written, a preview counts the cards, decks, tags, pictures and reviews coming across, names what will be dropped, and lists the duplicates (ADR 0004).
- **Progress carries.** Each Anki card's review log replays into Lymi's scheduler, so due dates and Insights match what the learner had. Mochi's remembered-or-forgot log replays as Good and Again.
- **One import is one thing.** It has a name, a date and a count in Activity, and archiving it takes every card it brought.
- **It runs on a phone with a 200 MB file**, with no memory or time limit surprising the learner halfway through.

## Confirmed facts

- Anki exports two containers, a legacy zip of SQLite and the zstd `anki21b` form written by default since 23.10. No npm package reads the current form in a browser; `sql.js` and `fzstd` plus a small protobuf decoder do.
- Anki's `revlog` has Lymi's four grades with a millisecond timestamp each, and `cards.data` holds FSRS stability and difficulty, both only when the learner ticked "Include scheduling information".
- Mochi's `.mochi` export is JSON with Markdown cards, nested decks and a per-card review list. Quizlet exports only pasted text with a chosen separator. Memrise, Knowt and Reword export nothing usable.
- Lymi's add path batches 200 cards a call and skips duplicates. Nothing writes `reviews` but a grade, and `reviews.source` has no import value.
- ts-fsrs `reschedule` replays a history into a card, and the dev persona seeder already writes this shape. A Worker has 128 MB of memory and a 100 MB request body.

## Hypotheses

- Field mapping by name pattern gets the common language decks right, and the preview catches the rest.
- Replaying history through Lymi's default parameters lands due dates within a day of Anki's for most cards; a card with hundreds of reviews may drift, and that is acceptable.
- One "paste or drop a list" importer with separator detection covers Quizlet, Brainscape, Noji, Duocards, Lingvist and Sheets without code of their own.

## Options for where the work runs

| | Client parses, server stores | Worker parses | Client parses, Worker imports through a job |
| --- | --- | --- | --- |
| Fits | ADR 0002: extraction on the client, the server validates and persists | Would let API and MCP clients upload a file | Same as the first, plus resumable large imports |
| Cost | WebAssembly SQLite in a lazy route chunk; the phone holds the file | Memory and CPU ceilings; R2 staging and a Workflow for anything large | An `imports` row with progress and a chunked history endpoint |
| Loses | File upload through the API | Large collections | Nothing but the extra table |

Lean: the third. A ten-year collection is hundreds of thousands of review rows, so the write must be chunked and restartable whatever parses the file, and the import row that makes it restartable also makes "archive this import" possible.

## Sources in order of value

1. **Anki `.apkg`**, both forms, with history and pictures. Also receives RemNote, Language Reactor and Migaku exports.
2. **Pasted or dropped text**, CSV and TSV with header mapping. Covers Quizlet and the spreadsheet apps.
3. **Mochi `.mochi`**, with its review list. The audience closest to Lymi's.

## Smallest useful slice

Anki content only: read both containers on the client, map Basic, reversed and cloze note types into cards, choose one language per import, show the preview, write through the existing add path with an import row for provenance and undo. History, pictures and the text importer follow as separate slices; pictures reuse the upload route and wait for a description before any picture mode is asked.

## Open questions

1. Does imported history count toward the streak, or only toward scheduling and Insights? Reviews before daily goals already count as reviewed days, so a continuous Anki habit would extend the flame. Lean: yes, recorded with `source: import`.
2. Replay the review log through Lymi's scheduler, or trust Anki's exported stability and difficulty? Lean: replay, so every review row carries Lymi's own memory state and the scheduler stays one; use the exported state only for a card with state but no log.
3. What happens to the native-speaker audio in decks like Kaishi? Lymi generates speech and has no learner-audio path. Lean: drop it in the first version and say so in the preview; a learner-audio path is its own proposal.
4. Field limits: Anki fields exceed 1000 characters routinely. Truncate with a warning, or raise the meaning and notes limits?

## To proceed

Export one real Anki collection in both forms and one `.mochi` file, then confirm that a phone can open them and that a replayed history lands within a day of Anki's due dates. With that evidence, decide questions 1 and 2, record the schema additions (`imports`, `cards.import_id`, `reviews.source = import`) in an ADR if they prove hard to reverse, and write the plan.
