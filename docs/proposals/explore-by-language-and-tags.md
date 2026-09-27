---
status: accepted
date: 2026-09-27
decision: Explore shelves by language and subject, structured tags, and More like this; level is dropped
issues:
  - https://github.com/krambertech/lymi/issues/394
---

# Explore by language and tags

## Outcome

A visitor finds a deck by the language it teaches or by its subject, and each deck page points to related decks. On 27 September 2026, 55 of the 76 published decks sat on one Languages shelf across about 20 languages, and non-language decks were titled "English vocabulary".

## Decisions

- **A shelf per language.** A deck with category `languages` sits on the shelf of the language it teaches (the deck's language). No Languages heading groups them. Language shelves come first, most decks first, then the subjects.
- **Subjects.** `geography`, `science`, `driving`, `citizenship` (new), `technology`, `work`. `exams` is dropped: an exam is a reason to learn, so it becomes a tag. Exam word lists move to their language, and citizenship tests move to Citizenship.
- **Prominent shelf chips.** The chips at the top of Explore follow the shelf order and are the main way to jump.
- **No level.** The publication's `level` column and field go. A level lives in the deck's name ("Spanish A1") and, where useful, in a tag.
- **Language only when the deck teaches one.** A deck with no language gets no audio and no language-specific AI, which already works. Its page title and structured data name its subject, never "English vocabulary".
- **Structured tags.** A closed list of keys in `packages/core`, each with a Lingui label translated like the shelf headings. A publication holds several. The deck page shows them as plain chips, and Explore search matches them. Adding a tag is a code change.
- **More like this.** A row on the deck page, on `lymi.app` and in the product, ranked by shared tags, then the same language, then the same subject. The product leaves out decks the learner already has.

First tags, for review in delivery: `core-words`, `conversation`, `travel`, `alphabet`, `grammar`, `beginner`, `exam-goethe-a1`, `exam-hsk-1`, `exam-topik-1`, `exam-jlpt-n5`, `exam-leben-in-deutschland`, `exam-us-civics`.

## Later

A landing page per supported language with several decks, and a page per tag. A Culture shelf once a culture deck exists.

## Delivery

1. Language shelves, the new subject list, the prominent chips, subject-aware titles, and dropping level, in both Explores.
2. Tags and More like this.
3. In lymi-lab: read the categories and tags from the product, allow a deck with no language, and re-file the live decks.

Publisher rate limits and named publishing errors are separate work.
