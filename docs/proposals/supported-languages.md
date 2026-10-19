---
status: exploration
date: 2026-10-19
decision: none
---

# Supported languages

A learner of Japanese finds that Lymi just works: readings over kanji that fade as words become Known, audio that says the word right, imports that arrive whole, beginner decks and a page of its own. Lymi should give a short list of languages that treatment, with features made for each, without a mode or a setting and without language checks spread through the code. The card's language tag still decides everything, and every other language works as today. [Japanese](japanese.md) is the first; Chinese, in its own proposal, the second.

## Evidence

Demand, as of 2026-10: Duolingo's 2025 report ranks Japanese 4th, German 5th and Korean 6th, and Chinese the fastest-growing in 12 countries; US college enrolment in Korean rose 38% from 2016 to 2021 (MLA).

Today each language is a literal in a helper (`DRAWN = new Set(["ja"])` and `=== "zh"` in `packages/core/src/reading.ts`), a sentence inside a generic prompt, or a branch in one of about ten screens that choose how to draw a term. Inline example readings parse kana only, and the API docs call `pronunciation` IPA. A new language means another edit in each.

## Decision (leaning)

**The word.** CONTEXT.md gains **Supported language**: a language Lymi treats in full, from its card's tag alone. _Avoid_: first-party language, featured language, native language, profile, mode. "Native language" and "Profile" are already avoided under Meaning language and Style, so the code type is `LanguageSupport`.

**Tiers.** Any language gets nothing added. A **configured** language (Korean, German, Estonian) has a row of data and pure functions in a separate table, with no page or fixture required. A **supported** language has an engine with a renderer on the web and the phone, and full support: its reading drawn and fading, speech from the right text, reading-aware duplicates, its script's faces, its prompt text with a passing evaluation, an Anki deck and its dominant tool importing whole, beginner decks, its format in the API and docs, verify features, analytics and a page. A **platform** language (Arabic, Hebrew, Thai) needs right-to-left layout or word breaking first, and the phone's Hermes cannot be assumed to have `Intl.Segmenter`. A tag joins `SupportedTag` only in its language's last delivery slice, and every registry is a `Record<SupportedTag, …>`, so a missing piece fails typechecking.

**Records.** `packages/core/src/languages/` holds one TypeScript record per language and the only language-code comparisons. Records hold functions, are type-checked, ship in the phone for offline review, and change with a test, so they are not JSON or database rows. A record resolves from the full tag: `zh-HK` and `yue` are Cantonese and take no pinyin record. Shared code asks the index (`drawsReading(tag)`, `spokenText(card)`, `script(tag)`), never a code.

**Pronunciation and Reading.** A card keeps one `pronunciation` field. For a script that does not show its sound it holds a Reading, and the record declares the label and format; otherwise IPA or a respelling. Example readings stay inline in `example` (`毎朝[まいあさ]パンを食[た]べます。`), and parsing, stripping and checking them take the language.

**Engines.** Two families, each a subpath export so the phone ships only what it draws. **Over the script**: furigana, and one syllable per character for pinyin now and jyutping later. **Marks in place**: the pronunciation is the term plus marks, drawn until Known, and stripping the marks gives the term back (Russian and Ukrainian stress, Arabic harakat, Hebrew niqqud); where pointed and plain spellings differ in letters, as Hebrew's can, the reading is drawn whole as a line. Example readings fade only for the first family, since stress moves with inflection, and Known-pair keys are namespaced by engine. One `TermText` and one `ExampleText` per platform own the switch between families; a Grit rule keeps `termReading` and `parseReadings` out of other screens.

**Writes.** `normalizeCardText(language, fields)` in core converts only unambiguous input: tone numbers to marks, and `食[た]べる` in a term into term and Reading, only for a furigana language with kana in the brackets and no different pronunciation sent. It runs in `addCards` after the language is resolved, in edits, import, enrichment and the outbox, before the duplicate key, corrections and the audit row, so a converted term finds its duplicate and a converted Reading never counts as a correction. Added and updated outcomes gain an optional `normalized` list of converted fields; a card is never rejected for its format.

**Duplicates.** The lookup matches `normalized_term` exactly, so a language's reading key may only split cards, never merge them. `readingKey({ term, pronunciation })` returns null unless the pronunciation is a valid reading for the engine, so an old IPA line never splits a word in two. `normaliseTerm` strips a stray U+0301 after NFC, which no precomposed letter uses, with a backfill of `normalized_term`; Anki import moves stress marks from the term into the pronunciation. Offline, the outbox queues an add whose pronunciation differs from a local match for the server to decide, and the minimum phone version rises, before any new reading key ships.

**Older phones.** A reading style's notation reaches examples only once the minimum supported phone draws it; until then the Worker strips it for older clients by `x-lymi-client` (ADR 0032).

**Prompts.** Each supported language has a server module with its voice and slots for enrichment (with example readings and its worked example), Smart add, hooks and `checks`. Slots reach the model as per-deck input, because one call carries several decks and Smart add may choose the deck; system prompts stay static and cacheable, and import detection composes every record's hints. Each call site has one prompt version, and a bump never rewrites stored AI text. A fluent reader reviews each module.

**Evaluation.** Each language has invented fixtures, twenty or more per slot, led by its traps (上手 じょうず and うわて, 行 háng and xíng, за́мок and замо́к). A live run saves replies with the prompt hash and model; CI rescores the saved run, fails when the hash is stale, and compares per-rule pass rates with the previous run.

**One source of facts.** Core exports each record's public fields through a Zod `LanguageOut`. The guide's pronunciation line, a public cacheable `GET /api/languages`, a `languages` map in `list_decks` for the tags the learner's decks use, and `/docs/languages` all come from it, including each style's bracket pattern. `pronunciation` stays the only API field.

**Data model.** No schema change or new table. Rules live in code; alignment, reading keys, Known pairs and scripts are derived and never stored; `reviews` holds nothing about readings.

**Pages.** Each supported language has its own view and showpiece: Japanese's return lane and 日 with seven readings, a Known 银行 fading 行 háng in 行长 but not 行 xíng in 不行, за́мок against замо́к. A `LANGUAGE_PAGES` table feeds routes, the sitemap and the header links, and a shared `LanguagePage.astro` makes each locale file one line, as `/exams/[exam]` does. `docs/stack.md` and ADR 0016's scope change with it.

**Enforcement.** Types catch a missing registry entry. A conformance test runs every record's fixture: aligning then joining gives the term back, parsing then formatting gives the example back, stripping marks gives the term, keys hold across NFC and NFD, kana forms and tone notations, and an IPA line gives no key. Another test checks each supported language's verify features, named by language as `japanese.md` with a row in each skill's table, and a face token per script, which Russian and Ukrainian share. A Grit tripwire in core, client, web and mobile fails on a supported tag compared with `languageKey(…)`, `.language` or `lang`, cased, or listed in a literal set; files not yet moved are excluded in `biome.json` and leave as they move. Interface-locale checks and `apps/site` are out of scope.

**When a bespoke feature is worth it.** All of: the generic path is wrong, not merely plainer; learners already rely on it; it fits an extension point, or names the second language that will use a new one; it ships with fixtures, evaluation cases and a verify feature; it needs no setting. Tone colour fails the first.

**Instrumentation.** The question: does each supported language keep its learners reviewing, and does recall hold once the reading leaves the cue? `review_graded` reports `reading`, `example_readings` and `readings_faded` for any drawn reading, with `reading_language` typed as `SupportedTag`; Japanese charts add `reading_language=ja` when Chinese sends. `enrichment_finished` gains `languages`.

**Roster.** Supported: Japanese (done), Chinese, Russian, Ukrainian. Configured: Korean (pronounced Hangul where the spelling differs, Sino-Korean roots, a default voice, TOPIK I decks), German (article and plural), Estonian (principal forms). Platform first: Arabic, then harakat. Later: Cantonese, Hebrew, Thai.

**ADRs on acceptance.** Behaviour comes from the tag through records, never a setting; `pronunciation` stays the only field.

## Delivery

1. The record and index with Japanese alone, `TermText` and `ExampleText`, face tokens and the Grit tripwire; behaviour unchanged.
2. Japanese's prompt module, its text moved verbatim, with an `evaluation.json` run as evidence, then the recorded-run harness.
3. `normalizeCardText`, the new `readingKey`, the U+0301 strip and backfill, and the offline queue.
4. a. The shared site parts. b. `LanguageOut`, `GET /api/languages`, the `list_decks` map and `/docs/languages`, since the two Workers deploy apart (ADR 0009).
5. Chinese, through its proposal.
6. Leaning: Russian, then Ukrainian, then Korean, since Russian and Ukrainian have a reviewer at hand.

## Open questions

1. The word: **Supported language**, or "first-party language"?
2. Who reviews the Japanese, Chinese and Korean prompts?
3. Is a stress or vowel mark a Reading on the form, or does it need its own label?
4. Should the API also return a plain copy of the example?
5. Should German's duplicate rule ignore the article, which means changing `normaliseTerm`, a backfill and amending ADR 0004?
6. Do the voices read U+0301 as stress, or must speech strip it?
7. Should Russian duplicates fold ё into е?
8. Should `checks` also run in production, leaving a failing field empty while the card still saves, or stay evaluation-only?
9. Does Korean or Russian come third? Demand ranks Korean higher; a reviewer is at hand for Russian.
