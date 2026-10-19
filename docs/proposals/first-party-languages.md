---
status: exploration
date: 2026-10-19
decision: none
---

# Supported languages

A learner of Japanese now finds that Lymi just works: readings over kanji that fade as words become Known, audio that says the word right, imports that arrive whole, beginner decks at Welcome and a page at `lymi.app/languages/japanese`. Lymi should offer that to a short list of languages, one at a time, without a mode or a setting: the card's language tag still decides everything, and every other language keeps working as it does today. This proposal defines what full support means, one per-language record in `packages/core` that replaces today's scattered checks, and one landing-page template. The languages themselves have their own proposals: [Japanese](japanese.md) is the first, [Chinese](chinese.md), being shaped alongside this one, the second. Not decided: the domain word, where the server-only pieces live, and how the page template handles each language's showpiece section (see Open questions).

## Evidence

Language behaviour today, on `main` at f0a4809f:

| Concern | How it is decided | Where |
| --- | --- | --- |
| Readings drawn over the term | `DRAWN = new Set(["ja"])` | `packages/core/src/reading.ts:22`, `:173` |
| Pronunciation field called Reading | `["ja", "zh"]` | `packages/core/src/reading.ts:168` |
| Reading kept as a line on the cue until Known | `=== "zh"` | `packages/core/src/reading.ts:79` |
| A reading that counts, and the duplicate key | kana only, `!== "ja"` | `packages/core/src/reading.ts:57`, `:67` |
| Pronunciation and notes on by default | `READING_LANGUAGES`, `FORM_LANGUAGES` | `packages/core/src/enrichment.ts:35`, `:38` |
| Language from a deck's script | kana is `ja`, Hangul `ko` | `packages/core/src/languages.ts:93` |
| Enrichment guide | `GUIDES`, keyed by primary subtag | `apps/web/src/server/enrichment/languages.ts:7` |
| AI checks and example readings | `drawsReadings`, `missingReadings`, `addsReadingsOnly` | `apps/web/src/server/enrichment/checks.ts:152`, `apps/web/src/server/services/enrichment.ts:114`, `:128`, `apps/web/src/server/enrichment/evaluate.ts:146` |
| What speech reads | `kanaReading(card) ?? card.term` | `apps/web/src/server/services/audio.ts:234` |
| Voice | `NATIVE_SPEECH_VOICES`; Korean has a voice but is left out of the defaults | `apps/web/src/server/ai/speech-voices.ts:4`, `:33` |
| Duplicates | `readingKey` | `apps/web/src/server/services/cards.ts:227`, `packages/client/src/writes.ts:455`, `apps/web/src/server/services/import-writer.ts:165`, `apps/web/src/server/services/lessons.ts:171` |
| Web font | `:lang(ja)` only | `packages/design/tokens.css:312` |
| Phone font | `JAPANESE_FACE` when `languageKey(lang) === "ja"` | `apps/mobile/src/ui/primitives.tsx:52`, `:97` |
| Import | kana readings kept, pinyin dropped, pitch to notes | `apps/web/src/server/imports/anki/index.ts:417`, `:436`, `apps/web/src/server/imports/anki/text.ts:79` |
| Beginner decks | `BEGINNER_DECKS.ja` | `packages/client/src/welcome.ts:22` |
| Analytics | `review_graded.reading`, Japanese only | `apps/web/src/server/services/review.ts:389`, `docs/analytics.md:30` |
| Landing | `JapaneseView` is bespoke; `LanguagePage` is shared by Estonian and Languages; one `.astro` file per locale per language | `apps/site/src/components/landing/JapaneseView.tsx:180`, `apps/site/src/components/landing/LanguagesView.tsx:190`, `apps/site/src/pages/languages/japanese.astro`, `apps/site/src/lib/routes.ts:5` |
| Verify | web `japanese`, `furigana`, `import-recordings`, `welcome-japanese`; phone `japanese`, `chinese` | `.agents/skills/verify/features/`, `.agents/skills/verify-phone/features/` |

Callers branch on these helpers in about ten client files, such as `apps/web/src/client/views/review-view.tsx:528` and `apps/mobile/src/app/review.tsx:1293`, so a language added by editing the helpers reaches both apps, but each helper grows its own list.

## Decision (leaning)

**The word.** CONTEXT.md gains **Supported language**: a language Lymi treats in full, whose readings, audio, duplicates, fonts, enrichment, imports, beginner decks and public page follow its own rules. The card's language tag makes a card one; nothing else does, and no setting turns it on. _Avoid_: first-party language, featured language, native language, profile, mode. "Native language" is already avoided under Meaning language, and "Profile" under Style, so the code type is `LanguageSupport`, not a profile.

**Full support** is done when each line holds, on the web and the phone:

1. **Reading and audio.** The reading is stored in the pronunciation field, drawn in the language's style, and fades once the card is Known; speech reads what the language says it should; an import's recording is never replaced.
2. **Duplicates.** Two cards with the same term and different readings are two words (上手 じょうず and うわて, 行 háng and xíng, за́мок and замо́к).
3. **Fonts.** The script draws in its own faces on the web and the phone, so a shared Han character never takes another language's form.
4. **Enrichment.** A guide, the AI checks that hold the AI to it, and an evaluation set with a passing run.
5. **Import fidelity.** A test import of the most-used Anki deck and of the language's dominant tool (Pleco for Chinese) keeps readings, recordings and notes.
6. **Beginner decks.** `BEGINNER_DECKS` names the published decks Welcome offers first.
7. **Verify.** A feature for each of the web and phone skills that drives the reading in review.
8. **Instrumentation.** `review_graded` carries `reading_language` for the language, as the Chinese proposal adds.
9. **Page.** `lymi.app/languages/<language>` in English, Ukrainian and Russian, from the template.

**One record per language** in `packages/core/src/language-support.ts`, looked up by primary subtag, holding what both apps and the server branch on:

```ts
type ReadingStyle = "furigana" | "pinyin" | "stress" | "none";

interface LanguageSupport {
  reading: ReadingStyle;
  align(term: string, reading: string): ReadingSegment[] | null;
  stripReadings(text: string): string;
  readingKey(reading: string): string | null;
  spoken(card: { term: string; pronunciation?: string | null }): string;
  script(tag: string): string; // "Jpan", "Hans", "Hant", "Kore", "Cyrl"
}
```

`drawsReadings`, `writtenWithReading`, `cueKeepsReading`, `kanaReading`, `readingKey` and the phone's `=== "ja"` become one lookup each, and a language with no record behaves as today. `READING_LANGUAGES` and `FORM_LANGUAGES` stay, since they cover unsupported languages too. Reading styles: `furigana` is Japanese today; `pinyin` is one syllable over each hanzi, from the Chinese proposal; `stress` draws the stressed term in place for Russian and Ukrainian, and keys duplicates by the stressed form; `none` is a language whose writing shows its sound, where support is word forms in notes (German, Estonian) or Korean's sound changes.

**What stays where it is used.** The enrichment guide, the voice and the beginner decks stay in their homes, keyed by the same subtag, so prompt text and vendor voice IDs stay out of the phone bundle. The faces stay in `packages/design/tokens.css` as `:lang()` rules, because CSS cannot read the record, and the phone's face moves into `packages/design` beside them. One test per home fails when a supported language lacks its guide, voice, beginner decks, `:lang()` rule or page content.

**One page template.** `LanguagePage` in `apps/site/src/components/landing/LanguagesView.tsx` becomes the template for every supported language, absorbing what `JapaneseView` has that others lack: the deck path from `BEGINNER_DECKS` and the row of every published deck, both rendered per request through `resolveLanguageDecks`. A language supplies a content module with its hand, voice words, class deck, questions and every headline, each as its own message, because Ukrainian and Russian inflect a language's name and the template can never build a sentence around one. The reading section is the language's showpiece (`KanjiReadings` for Japanese, pinyin over hanzi for Chinese, a stress pair for Russian). One dynamic route per locale, `languages/[language].astro`, answers for each supported language and 404s for any other, so a new language adds no page files. Estonian keeps its page until it becomes supported.

## Delivery

1. The record with Japanese as its only entry, every helper and the phone font reading it, behaviour unchanged.
2. Chinese as the second entry, through the Chinese proposal's slices.
3. The page template, with Japanese moved onto it and the dynamic route.
4. The Chinese page on the template.
5. Korean, then Russian and Ukrainian, each with its own proposal.

## Open questions

1. The word: **Supported language**, or something else? "Supported" may read as if other languages are not, on the site.
2. Should the guide, voice and beginner decks live in the record, as the brief suggested, or beside their one consumer behind coverage tests, as leaned?
3. Does Korean need a reading at all? Hangul shows its sound; the guide now asks for Revised Romanization, which beginners outgrow fast. Pronunciation in Hangul with its sound changes (학교 [학꾜]) may be the real need.
4. Does each voice read Russian and Ukrainian stress marks (U+0301) as stress, or must speech strip them? A listening test decides `spoken` for `stress`.
5. Should Japanese's bespoke sections (the return lane, 日 with seven readings) survive the move to the template, or become the Japanese content module's showpiece?
6. Which tool is dominant enough to import for Korean, Russian and Ukrainian, as Pleco is for Chinese?
