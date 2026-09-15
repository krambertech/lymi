# Import formats

What the apps a learner might leave behind can export, and how each piece maps onto a Lymi card. Research for [the import proposal](proposals/importing-from-other-apps.md); facts checked on 15 September 2026 against the sources linked, with unconfirmed points marked. This page describes; the proposal decides.

## What Lymi can receive today

`POST /api/cards` takes up to 200 `CardInput` rows per call, skips duplicates by normalised term and language (ADR 0004), and writes each card with due-now `card_states` for its text modes. A card holds term (500 chars), meaning (1000), pronunciation (200), example (1000), notes (2000), a BCP 47 language, up to 20 tags of 40 characters, a 200-character free-text `source`, its review modes and a field source for meaning and example. Scheduling is one ts-fsrs `Card` per mode in `card_states.fsrs`, and `reviews` is append-only with the memory state after each grade. `reviews.source` is `web | api | mcp`, and nothing but a grade writes either table. There is no import surface, no learner-uploaded audio, and one active picture per card, which is asked in picture modes only once it has a description.

`seedPersona` in `apps/web/src/server/services/dev.ts` is the one precedent for writing history: it replays `schedule()` grade by grade and inserts review rows seven per statement, because D1 binds at most 100 parameters and a review row has 13. ts-fsrs 5.4 also ships `reschedule(card, history)`, which replays a `{ rating, review }` list into a card and its logs.

## Anki

The container is a zip. Modern Anki writes a `meta` protobuf naming the version, the collection as SQLite, a dummy `collection.anki2` telling old clients to upgrade, numbered media files and a `media` index ([export.rs](https://github.com/ankitects/anki/blob/main/rslib/src/import_export/package/colpkg/export.rs), [import_export.proto](https://github.com/ankitects/anki/blob/main/proto/anki/import_export.proto)). Two shapes are in the wild and both need support:

| | Legacy (`collection.anki21`, schema 11) | Current (`collection.anki21b`, schema 18) |
| --- | --- | --- |
| Who writes it | AnkiWeb shared decks, genanki and most generators, Anki with "Support older Anki versions" ticked | Anki 23.10 and later by default ([release](https://github.com/ankitects/anki/releases/tag/23.10)) |
| Collection file | Plain SQLite, deflated | SQLite, zstd-compressed, stored |
| Note types and decks | JSON in `col.models`, `col.decks`, `col.dconf` | Protobuf blobs in `notetypes`, `fields`, `templates`, `decks`, `deck_config` |
| Media index | JSON `{"0": "name.mp3"}` | Protobuf `MediaEntries`, zstd; each file zstd too |

`notes`, `cards` and `revlog` keep the schema 11 shape in both. A note has `guid`, `mid`, space-separated `tags` and `flds` joined by `\x1f`; fields are HTML with `[sound:file.mp3]` and `<img src>` references, and furigana as `漢字[かんじ]`. A standard note type makes one card per template (`ord` is the template index); a cloze note makes one card per cloze number with `{{c1::text}}` or `{{c1::text::hint}}` ([stock.rs](https://github.com/ankitects/anki/blob/main/rslib/src/notetype/stock.rs), [AnkiDroid database structure](https://github.com/ankidroid/Anki-Android/wiki/Database-Structure)).

Progress is present only when the learner ticked "Include scheduling information"; otherwise cards are reset to new and `revlog` is dropped. With it, `revlog` holds one row per grade: `id` in ms, `cid`, `ease` 1 to 4 in the same order as Lymi's grades, `ivl`, `time` in ms, and `type` 0 learning, 1 review, 2 relearning, 3 filtered, 4 manual, 5 rescheduled ([revlog/mod.rs](https://github.com/ankitects/anki/blob/main/rslib/src/revlog/mod.rs)). Since 23.10 `cards.data` is JSON with the FSRS memory state: `s` stability, `d` difficulty 1 to 10, `dr` desired retention, `decay`, `lrt` last review time ([data.rs](https://github.com/ankitects/anki/blob/main/rslib/src/storage/card/data.rs)). Card `due` is encoded by queue: a position for new cards, epoch seconds in learning, days since `col.crt` for review. FSRS-6 parameters live per preset in `deck_config` as `fsrsParams6` with 21 values ([fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs)); Lymi runs default parameters, so these are informational only.

Language decks name their fields inconsistently: Kaishi 1.5k has Word, Word Furigana, Word Meaning, Word Audio, Sentence, Sentence Meaning, Picture, Notes ([Kaishi](https://github.com/donkuri/Kaishi)); the Yomitan mining template has Word, Reading, Glossary, Sentence, Picture, Audio ([Basic-Mining-Deck](https://github.com/friedrich-de/Basic-Mining-Deck)). Match fields by name pattern (word, expression, vocab; reading, furigana, kana; meaning, glossary, definition; sentence, example; picture, image; audio, sound) and let the learner correct the guess per note type.

No npm parser reads `anki21b` in a browser. `sql.js` 1.14 (MIT) runs SQLite as WebAssembly, `fzstd` 0.1 (MIT) decompresses zstd in pure JavaScript, and a small protobuf decoder covers `MediaEntries` and the schema 18 note type blobs. `anki-apkg-parser` 1.0 handles the new format but only under Node, and `anki-reader` 0.3 only the legacy file.

Mochi, RemNote and Noji all import `.apkg` and say they keep review history when scheduling was included; Mochi converts HTML to Markdown and strips CSS. RemNote also exports `.apkg`, so an Anki importer covers RemNote learners too.

## Mochi

A `.mochi` export is a zip with `data.json` and an `attachments/` folder. The JSON has `version` 2 and vectors of decks, cards and templates in Transit-style keys: a card has `content` in Markdown with a `---` line between sides, `deck-id`, `template-id`, `fields`, `manual-tags`, `attachments`, `archived?`, `review-reverse?`, and `reviews`, each review `{ date, due, interval, remembered?, duration }` ([format reference](https://mochi.cards/docs/import-and-export/mochi-format-reference/), [API](https://mochi.cards/docs/api/), both read through search snippets because the host was unreachable from the research sandbox). Decks nest through `parent-id`. Mochi's Markdown and CSV exports lose history and tags; the CSV is Anki-compatible. Whether Mochi's newer FSRS scheduler puts stability into the export is unconfirmed.

`remembered?` is binary, so a Mochi history replays as Good and Again only. Two-sided cards with `review-reverse?` map onto both text modes.

## Spreadsheets and pasted lists

One text importer with header mapping and separator detection covers most of the rest:

| Source | What comes out | Notes |
| --- | --- | --- |
| Quizlet | Clipboard text, chosen term and row separators; own sets only | No file, no progress, no pictures ([help](https://help.quizlet.com/hc/en-us/articles/360034345672)) |
| Anki "Notes in plain text" | TSV with `#separator`, `#html`, `#tags column`, `#deck column`, `#guid column` headers | HTML when `#html:true` ([manual](https://github.com/ankitects/anki-manual/blob/main/src/importing/text-files.md)) |
| Brainscape | Per-deck spreadsheet, Pro only, question and answer columns | Confidence levels not in the official export |
| Noji | CSV per deck, text only; `.ofc` is proprietary zstd | Progress only in `.ofc` |
| Duocards, Lingvist, Clozemaster | CSV with word, translation, example, or sentence with the cloze in brackets | Lingvist adds tag and meaning-language columns |
| Google Sheets, Excel | Term, meaning, example, notes, tags in any order | The common hand-kept vocabulary list |

Memrise offers only a personal-data HTML file; Knowt exports PDF; Reword's backup is undocumented. None is worth a dedicated importer.

## Progress interchange

No app exports FSRS memory state in a documented interchange form. Anki's `revlog` plus `cards.data` is the only widely available source of both history and state. The FSRS optimizer's `revlog.csv` (`card_id, review_time, review_rating, review_state, review_duration`) and py-fsrs's JSON `Card` and `ReviewLog` are the closest things to a portable shape ([fsrs-optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer), [py-fsrs](https://github.com/open-spaced-repetition/py-fsrs)). Lymi's own CSV export carries state and due but no history, which the market proposal already calls an incomplete portability story.

## Platform limits that shape the design

A Worker has 128 MB of memory and 30 s of CPU by default, and a request body of 100 MB on the current plan. D1 binds 100 parameters per statement, caps a statement at 100 KB and a Worker invocation at 1000 queries. A ten-year Anki collection can hold several hundred thousand review rows and hundreds of megabytes of media, so parsing in the Worker only works for small files, and any history import must be chunked and resumable.
