---
status: exploration
date: 2026-10-19
decision: none
---

# Supported languages

A Japanese learner now gets readings that fade as words become Known, audio that says each word correctly, imports that keep every field, beginner decks and a page of their own. This proposal gives a few more languages the same treatment, each with features built for it. There is no mode or setting, and language checks do not spread through the code: the card's language tag decides everything, and every other language works as it does today. [Japanese](japanese.md) is the first supported language; Chinese, in its own proposal, is the second.

## Evidence

Demand, as of October 2026: Duolingo's 2025 report ranks Japanese 4th, German 5th and Korean 6th, and names Chinese the fastest-growing language in 12 countries. MLA data shows US college enrolment in Korean rose 38% between 2016 and 2021.

Today a language's behaviour lives in three kinds of place: a literal in a helper, such as `DRAWN = new Set(["ja"])` and `=== "zh"` in `packages/core/src/reading.ts`; a sentence in a generic prompt; and a branch in about ten screens that draw terms. Inline example readings parse only kana, and the API docs describe `pronunciation` as IPA.

## Decision (leaning)

**The word.** CONTEXT.md gains **Supported language**: a language Lymi treats in full, decided by the card's language tag alone. _Avoid_: first-party language, featured language, native language, profile, mode. Style already avoids "Profile", so the code type is `LanguageSupport`.

**Tiers.** A language is in one of four tiers. **Any language** gets nothing new. A **configured** language (Korean, German, Estonian) is a row of data and pure functions in a separate table, and needs no page or fixture. A **supported** language has an engine, with a renderer on the web and on the phone, and every part of full support: readings that are drawn and fade, correct speech, reading-aware duplicates, fonts for its script, evaluated prompts, complete imports from Anki and from the tool its learners already use, beginner decks, its format in the API and docs, verify features, analytics and a page. A **platform** language (Arabic, Hebrew, Thai) first needs right-to-left layout or word breaking, which cannot rely on `Intl.Segmenter` in the phone's Hermes engine. A tag joins `SupportedTag` only in the last delivery slice for its language. Every registry is a `Record<SupportedTag, …>`, so a missing piece fails typechecking.

**Records.** `packages/core/src/languages/` holds one TypeScript record per language and is the only place that compares language codes. Records are code rather than JSON or database rows because they hold functions and ship inside the phone app. A record is chosen from the full tag. Only `yue` and `zh-yue` mean Cantonese, so a Cantonese learner tags the deck `yue`. Every other `zh` tag, including `zh-HK`, uses the Chinese record; its script comes from the tag's script subtag if there is one, otherwise traditional for Taiwan, Hong Kong and Macau, otherwise simplified. Shared code asks the index, as in `drawsReading(tag)`, `spokenText(card)` and `script(tag)`, and never compares a code itself.

**Pronunciation and Reading.** A card keeps one `pronunciation` field. For a script that does not show its sound, the field holds a Reading, and the record sets the field's label and format. For other languages it holds IPA or a respelling. Example readings stay inline in `example` (`毎朝[まいあさ]パンを食[た]べます。`), and the functions that parse, strip and check them take the language.

**Engines.** There are two engine families, each a subpath export so the phone ships only the engines it draws. **Over the script** puts the reading above the characters: furigana for Japanese, and one syllable per character for pinyin now and jyutping later. **Marks in place** stores the term with its marks as the pronunciation and draws that marked form until the card is Known; removing the marks must give the term back. It covers Russian and Ukrainian stress, Arabic harakat and Hebrew niqqud. Hebrew's pointed and plain spellings can differ in letters, and then the reading is drawn whole as a line. Example readings fade over Known words only in the first family, because stress moves as words inflect. Known-pair keys are namespaced by engine. On each platform, one `TermText` and one `ExampleText` component choose between the families, and a Grit rule keeps `termReading` and `parseReadings` out of every other screen.

**Writes.** `normalizeCardText(language, fields)` in core converts only input with one possible meaning. Tone numbers become tone marks. A term sent as `食[た]べる` splits into term and Reading, but only for a furigana language, only when the brackets hold kana, and only when no different pronunciation was sent. It runs on every write path: in `addCards` once the language is resolved, and in edits, import, enrichment and the phone's outbox. It runs before the duplicate check, the correction check and the audit row, so a converted term still finds its duplicate and a converted Reading never counts as the learner correcting the AI. Added and updated outcomes gain an optional `normalized` list of the converted fields. A card is never rejected for its format.

**Duplicates.** The duplicate lookup matches `normalized_term` exactly, so a language's reading key can tell cards apart but never merge them. `readingKey({ term, pronunciation })` returns null unless the pronunciation is a valid reading for the engine, so an old IPA line never splits one word into two cards. A key that merges cards has to change `normalized_term`, which needs an ADR 0004 amendment, agreement between the phone and the server, and a backfill. Russian and Ukrainian stress is the first such key: the term key takes the language, and only those two records remove U+0301. NFC keeps that mark on letters with no precomposed form, such as Lithuanian ą́, so no other language changes. Before rekeying, the backfill copies a stressed term into an empty pronunciation, so за́мок and замо́к stay two words. A card that already has another pronunciation keeps its stressed key until the learner edits it. Anki import moves stress marks from the term into the pronunciation. Before any new reading key ships, the phone's outbox stops skipping an offline add whose pronunciation differs from a local match and queues it for the server to decide, and the minimum phone version rises past that build.

**Older phones.** A reading style's example notation appears only once the minimum supported phone can draw it. Until then the Worker strips it from responses to older clients, identified by `x-lymi-client` (ADR 0032).

**Prompts.** Each supported language has a server module with its voice and one slot per AI call site: enrichment, including example readings and a worked example, Smart add, hooks and `checks`. Slots reach the model as per-deck input, because one call can carry several decks. System prompts stay static, so they can be cached. Import detection combines the hints from every record. Each call site has one prompt version, and raising it never rewrites AI text already stored. A fluent reader reviews each module.

**Evaluation.** Each language has at least twenty invented fixtures per slot, starting with its traps, such as 上手 read じょうず and うわて. A live run saves the replies with the prompt hash and the model. CI rescores the saved run, fails when the prompt hash no longer matches, and compares each rule's pass rate with the previous run.

**One source of facts.** Core exports each record's public fields through a Zod `LanguageOut`. Everything that describes a language comes from it: the pronunciation line in the AI guide, a public, cacheable `GET /api/languages`, a `languages` map in `list_decks` for the tags the learner's decks use, and `/docs/languages`. Each entry includes its reading style's bracket pattern. `pronunciation` remains the only API field.

**Data model.** There is no schema change and no new table. Rules live in code. Alignment, reading keys, Known pairs and scripts are worked out when needed and never stored, and `reviews` stores nothing about readings.

**Pages.** Each supported language has its own page view and a section that shows what is special about it: for Japanese, the return lane and 日 with seven readings; for Chinese, a Known 银行 fading 行 háng in 行长 but not 行 xíng in 不行; for Russian, за́мок against замо́к. A `LANGUAGE_PAGES` table feeds the routes, the sitemap and the header links. A shared `LanguagePage.astro` reduces each locale's file to one line, as `/exams/[exam]` already does. `docs/stack.md` and the scope of ADR 0016 change to match.

**Enforcement.** Types catch a missing registry entry. A conformance test runs each record against its fixture. Aligning a reading, parsing an example and removing marks each give the original text back. Keys match across NFC and NFD, kana forms and tone notations. An IPA line gives no key, Lithuanian ą́ keeps its mark, and за́мок and замо́к stay two words after the backfill. A second test checks that each supported language has its verify features, named by language (`japanese.md`) with a row in each skill's table, and a font token for each script; Russian and Ukrainian share one. A Grit rule works as a tripwire in core, client, web and mobile: it fails when a supported tag is compared with `languageKey(…)`, `.language` or `lang`, used as a `case`, or listed in a literal set. Files not yet moved to the index are excluded in `biome.json` until they move. Interface-language checks and `apps/site` are exempt.

**When a bespoke feature is worth it.** Build one only when all five hold: the generic path is wrong, not just plainer; learners already rely on the feature; it fits an existing extension point, or a second language will use the new one; it ships with fixtures, evaluation cases and a verify feature; and it needs no setting. Tone colour fails the first test.

**Instrumentation.** The question is whether each supported language keeps its learners reviewing, and whether recall holds once the reading leaves the cue. `review_graded` reports `reading`, `example_readings` and `readings_faded` whenever a reading is drawn, and gains a new `reading_language` property typed as `SupportedTag`. Japanese charts filter on `reading_language=ja` once Chinese starts sending. `enrichment_finished` gains an optional `languages`, left out when a run fails before its cards are read.

**Roster.** Supported: Japanese and Chinese (done), Russian and Ukrainian. Configured: Korean (pronounced Hangul where it differs from the spelling, Sino-Korean roots, a default voice, TOPIK I decks), German (article and plural) and Estonian (principal forms). Platform work first: Arabic gets right-to-left layout, then harakat. Later: Cantonese, Hebrew and Thai.

**ADRs on acceptance.** Two decisions become ADRs: language behaviour comes from the tag through records, never from a setting; and `pronunciation` stays the only field.

## Delivery

1. The record and index with Japanese alone, plus `TermText`, `ExampleText`, font tokens and the Grit tripwire. Its first excludes are the literal sets that hold supported tags: `READING_LANGUAGES` in `packages/core/src/enrichment.ts` and the voice sets in `apps/web/src/server/ai/speech.ts` and `speech-voices.ts`. Behaviour does not change.
2. Japanese's prompt module, its text moved verbatim with an `evaluation.json` run as evidence, then the recorded-run harness.
3. `normalizeCardText`, the new `readingKey` and the offline queue. The stress fold and its backfill ship with Russian.
4. a. The shared site parts. b. `LanguageOut`, `GET /api/languages`, the `list_decks` map and `/docs/languages`, in their own slice because the two Workers deploy separately (ADR 0009).
5. Chinese, as its proposal describes.
6. Leaning: Russian, then Ukrainian, then Korean, because Russian and Ukrainian have a reviewer at hand.

## Open questions

1. Is the word **Supported language**, or "first-party language"?
2. Who reviews the Japanese, Chinese and Korean prompts?
3. Does the card form call a stress or vowel mark a Reading, or does it need its own label?
4. Should the API also return a copy of the example without its brackets?
5. Should German's duplicate key ignore the article, merging cards as the stress fold does?
6. Do the voices read U+0301 as stress, or must speech remove it first?
7. Should Russian duplicates treat ё and е as the same letter?
8. Should `checks` also run in production, leaving a failing field empty while the card still saves, or stay evaluation-only?
9. Which comes third: Korean, with more demand, or Russian, with a reviewer at hand?
