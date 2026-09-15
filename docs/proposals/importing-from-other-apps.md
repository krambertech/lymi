---
status: accepted
date: 2026-09-15
decision: "issues [#227](https://github.com/krambertech/lymi/issues/227), [#228](https://github.com/krambertech/lymi/issues/228), [#229](https://github.com/krambertech/lymi/issues/229)"
---

# Import from Anki and Mochi, and export

A learner brings their Anki or Mochi collection into Lymi by handing over the file their app exports, and takes everything out again in a form Anki and Mochi can read. Cards, decks, tags, pictures and review history survive the move. The first importer also lays the foundation every later source reuses, so adding one is one adapter and one guide, not another pipeline.

## Decisions

- **The server does the work.** The file goes to R2, a Cloudflare Workflow parses it and writes in chunks, and the app shows progress by polling the import. Big files exceed the request limit, so the app sends them in parts. This delivery constraint is accepted. A Worker still has 128 MB of memory, so the collection's SQLite is held in memory while media streams from the zip; a collection past roughly 80 MB is asked to come back exported per deck.
- **Accept whatever the app exports.** Anki `.apkg` and `.colpkg` in both container formats, Mochi `.mochi`. The learner picks or drops the file in the app; the API takes the same upload for scripts. Nothing is converted by hand first.
- **An import is one thing.** It has a row with source, file name, status, counts and warnings, appears in Activity, and archiving it archives every card it added. Each imported card keeps its external id, so a second import of the same file updates instead of duplicating.
- **One card shape for every source.** A source adapter detects its file, inspects it into a preview, and reads it into the common imported-card shape. One writer maps that shape onto cards, states, reviews and pictures with the duplicate rule of ADR 0004. Mochi, and later spreadsheets or a Lymi zip, add an adapter and nothing below it.
- **Progress replays.** Each grade in the source's log runs through Lymi's scheduler, so every review row carries Lymi's memory state and there is one scheduler. Imported reviews are `source: import` with no review day: they show in Insights and light past days, and never count toward today's goal. Exported stability and difficulty are used only for a card with state but no log.
- **Language is chosen per import**, overridable per deck in the preview. Anki has no language; Lymi needs one for duplicates, audio and enrichment.
- **The preview tells the truth first.** Before anything is written: cards, decks, tags, pictures and reviews coming across; duplicates; what is dropped or shortened. Imported text is labelled `manual`, never `lesson` or `ai`.
- **Export is complete.** A Lymi zip with JSON and media that Lymi itself can import back, and a legacy Anki `.apkg` with scheduling and media that Anki, Mochi, RemNote and Noji read. CSV stays for spreadsheets. Files download only through an authenticated route.
- **Each source ships with a guide** in the public docs: how to export from that app, what carries over, what does not.

## What each source exports

| Source | File | Content | Progress | Media |
| --- | --- | --- | --- | --- |
| Anki, legacy | Zip, `collection.anki21` plain SQLite, schema 11 with JSON note types; what AnkiWeb and most generators write | `notes.flds` HTML joined by `\x1f`, `tags`, `guid`; one card per template or cloze number | `revlog` per grade (ms, ease 1–4 as Lymi's grades, type) and FSRS `s`, `d` in `cards.data`, only when "Include scheduling information" was ticked | Numbered files with a JSON index |
| Anki, current | Zip, `collection.anki21b` zstd SQLite, schema 18 with protobuf note types; Anki's default since 23.10 | Same tables | Same | zstd files with a protobuf index |
| Mochi | Zip, `data.json` version 2 plus `attachments/` | Markdown `content` split by `---`, `fields`, `manual-tags`, nested decks by `parent-id`, `review-reverse?` | `reviews` of `date`, `due`, `interval`, `remembered?` | Attachments folder |

Anki was not renamed. Noji is the former AnkiPro, an unrelated app whose CSV is a plain spreadsheet and whose `.ofc` is proprietary. RemNote and Language Reactor export `.apkg`, so the Anki importer receives them. Quizlet exports pasted text only, and Memrise, Knowt and Reword export nothing usable; text sources are a later adapter. No JavaScript package reads the current Anki container, so the adapter is built on `sql.js` and `fzstd` with a small protobuf decoder. Sources were read on 15 September 2026 from the Anki source tree, the AnkiDroid database wiki and Mochi's format reference.

## Mapping

| Source | Lymi |
| --- | --- |
| Anki deck `Parent::Child`, Mochi nested deck | One deck per deck that holds cards, named by its path; description and chosen language on the deck |
| Basic note | Term from the word field, meaning from the meaning field; fields matched by name pattern, corrected in the preview |
| Reversed note types, Mochi `review-reverse?` | One card asked in both text modes; each side's log replays into its mode |
| Cloze `{{c1::word}}` in a sentence | Term is the cloze text, example the sentence, meaning the extra field; one card per cloze number |
| Furigana `漢字[かんじ]`, a reading field | Pronunciation |
| HTML, Markdown | Plain text with line breaks; CSS, templates and scripts dropped |
| First `<img>` or attachment | The card's picture, without a description, so picture modes wait for one |
| `[sound:]`, audio attachments | Dropped and counted in the preview; Lymi generates speech. A learner-audio path is a separate proposal |
| Tags, including `a::b` | Tags, at most 20 of 40 characters; `marked` and `leech` dropped |
| Suspended card | Archived card; buried and filtered-deck cards are active |
| Text past a field limit | Meaning overflow moves to notes; notes are cut and counted as shortened |
| `remembered?` true or false | Good or Again |

## Out of scope

Pasted lists and spreadsheets, Noji's `.ofc`, keeping imported audio, AnkiWeb sync, and importing into a shared deck one does not own. Each is a later adapter or proposal, not a change to the foundation.
