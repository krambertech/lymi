---
status: exploration
date: 2026-10-19
decision: none
---

# Supported languages

A learner of Japanese now finds that Lymi just works: readings over kanji that fade as words become Known, audio that says the word right, imports that arrive whole, beginner decks at Welcome and a page at `lymi.app/languages/japanese`. Lymi should give a short list of languages that treatment, each with features made for it that other apps lack, without a mode or a setting and without language checks spread through the code. The card's language tag still decides everything, and every other language keeps working as it does today. This proposal sets the architecture every such language plugs into: a shared record, sanctioned places for bespoke features, prompts and their evaluation, the tests that hold it together, and a rule for when a feature is worth building. [Japanese](japanese.md) is the first language and [Chinese](chinese.md), shaped alongside this, the second. Not decided: the domain word and the open questions at the end.

## Evidence

Language behaviour today, on `main` at f0a4809f:

| Concern | How it is decided | Where |
| --- | --- | --- |
| Readings drawn over the term | `DRAWN = new Set(["ja"])` | `packages/core/src/reading.ts:22`, `:173` |
| Pronunciation field called Reading | `["ja", "zh"]` | `packages/core/src/reading.ts:168` |
| Reading kept as a line on the cue until Known | `=== "zh"` | `packages/core/src/reading.ts:79` |
| A reading that counts, and the duplicate key | kana only, `!== "ja"` | `packages/core/src/reading.ts:57`, `:67` |
| Pronunciation and notes on by default | `READING_LANGUAGES`, `FORM_LANGUAGES` | `packages/core/src/enrichment.ts:35`, `:38` |
| Language from a deck's script | kana is `ja`, Hangul `ko`; the rest asks the model | `packages/core/src/languages.ts:93`, `apps/web/src/server/services/import-languages.ts:39` |
| Enrichment guide | `GUIDES`, keyed by primary subtag | `apps/web/src/server/enrichment/languages.ts:7` |
| Japanese inside generic prompts | add-readings rule and a kanji worked example; readings "furigana … pinyin" in Smart add; hooks sound out "its pronunciation" | `apps/web/src/server/enrichment/prompt.ts:55`, `:95`; `apps/web/src/server/lessons/prompt.ts:24`; `apps/web/src/server/services/hook-draft.ts:46` |
| AI checks and evaluation | "readings over kanji"; one script over `evaluation.json`, whose decks include Japanese N5 and HSK 1 | `apps/web/src/server/enrichment/checks.ts:152`, `apps/web/src/server/enrichment/evaluate.ts:146`, `apps/web/package.json:23` |
| What speech reads | `kanaReading(card) ?? card.term` | `apps/web/src/server/services/audio.ts:234` |
| Voice | `NATIVE_SPEECH_VOICES`; Korean has a voice but is left out of the defaults | `apps/web/src/server/ai/speech-voices.ts:4`, `:33` |
| Duplicates | `readingKey` | `apps/web/src/server/services/cards.ts:227`, `packages/client/src/writes.ts:455`, `apps/web/src/server/services/import-writer.ts:165`, `apps/web/src/server/services/lessons.ts:171` |
| Fonts | `:lang(ja)` on the web; `JAPANESE_FACE` when `languageKey(lang) === "ja"` on the phone | `packages/design/tokens.css:312`, `apps/mobile/src/ui/primitives.tsx:52`, `:97` |
| Import | kana readings kept, pinyin dropped, pitch to notes | `apps/web/src/server/imports/anki/index.ts:417`, `:436`, `apps/web/src/server/imports/anki/text.ts:79` |
| Beginner decks | `BEGINNER_DECKS.ja` | `packages/client/src/welcome.ts:22` |
| Analytics | `review_graded.reading`, Japanese only | `apps/web/src/server/services/review.ts:389`, `docs/analytics.md:30` |
| Landing | `JapaneseView` is bespoke; `LanguagePage` is shared by Estonian and Languages; one `.astro` file per locale per language | `apps/site/src/components/landing/JapaneseView.tsx:180`, `apps/site/src/components/landing/LanguagesView.tsx:190`, `apps/site/src/lib/routes.ts:5` |
| Verify | web `japanese`, `furigana`, `import-recordings`, `welcome-japanese`; phone `japanese`, `chinese` | `.agents/skills/verify/features/`, `.agents/skills/verify-phone/features/` |

About ten client files branch on these helpers, such as `apps/web/src/client/views/review-view.tsx:528` and `apps/mobile/src/app/review.tsx:1293`. Each new language today means another literal in each helper and another sentence in each generic prompt.

## Decision (leaning)

**The word.** CONTEXT.md gains **Supported language**: a language Lymi treats in full, whose readings, audio, duplicates, fonts, AI text, imports, beginner decks and public page follow its own rules. The card's language tag makes a card one; no setting turns it on. _Avoid_: first-party language, featured language, native language, profile, mode. "Native language" is already avoided under Meaning language and "Profile" under Style, so the code type is `LanguageSupport`.

**Full support** is done when each line holds, on the web and the phone: the reading is stored, drawn in the language's style and fades once Known; speech says it right and never replaces an import's recording; two cards with one term and different readings are two words; the script draws in its own faces; every AI call site has the language's prompt text and a passing evaluation; an Anki deck and the language's dominant tool import whole; Welcome offers its beginner decks; a web and a phone verify feature drive it; `review_graded` reports it; and its page exists in all three site locales.

### Layer 1: one record per language

`packages/core/src/languages/` holds one file per supported language and an index, the only place a language code is compared. Each file exports a `LanguageSupport`:

```ts
interface LanguageSupport {
  tag: SupportedTag;                 // "ja" | "zh", the primary subtag
  reading: ReadingStyle;             // furigana, pinyin, stress or none
  script(tag: string): Script;       // zh-TW → "Hant"; faces and voices follow it
  readingKey(reading: string): string | null;
  spoken(card: CardText): string;    // kana for Japanese, hanzi for Chinese
  beginnerDecks: readonly string[];  // published slugs, in order
  exampleReadings?: ExampleReadings; // optional capability: fade over Known pairs
}
```

A reading style is an engine in `packages/core/src/readings/`: `furigana.ts` and `pinyin.ts` align a reading over the term, `stress.ts` draws the stressed term in place, and each parses, strips and formats its inline example notation. Shared code asks the index questions, never a code: `drawsReading(tag)`, `readingFades(tag)`, `readingLabel(tag)`, `readingKey(card)`, `spokenText(card)`, `beginnerDecks(tag)`, `script(tag)`. A tag with no record answers as today. `READING_LANGUAGES`, `FORM_LANGUAGES` and the plain `GUIDES` stay as the tier below, since they serve every language.

### Layer 2: bespoke features at named extension points

A language's own features plug in only at these points, each a typed optional member or a module named for the language:

- **Reading style**: a new engine, such as stress marks for Russian and Ukrainian.
- **Example readings**: the pairs that fade over Known cards, a word for Japanese and a character for Chinese.
- **Faces**: a `--font-script-<script>` token in `packages/design/tokens.css`, which the `:lang()` rules and the phone's generated tokens both read, so the phone stops naming Hiragino Sans in a component.
- **Prompts**: the slots below.
- **Import**: field rules that Anki's adapter applies by the deck's language, and an adapter of its own for the dominant tool, such as Pleco, under `apps/web/src/server/imports/`.
- **Page**: the content module and showpiece section below.

Shared code may switch on a `ReadingStyle` or test for a capability, because those are closed unions with an engine behind each; it never tests a language.

### Prompts

Each supported language has `apps/web/src/server/languages/<tag>.ts`, holding its voice and one typed slot per AI call site that has a language need:

- `enrich`: the field-by-field guide, replacing its `GUIDES` entry.
- `addReadings`: how its example readings are written, with one worked example, replacing the kanji example in the generic enrichment prompt.
- `lesson`: how lesson material prints its readings, for Smart add.
- `hook`: what to sound out, such as the kana reading, and what to keep, such as tones.
- `detect`: what sets it apart from a language sharing its script, for import detection.
- `checks`: code that holds the AI's text to the guide, such as tone marks on every syllable or a stress mark on every word of two or more syllables.

Generic prompts name "the language guide" and never a language, so the text a reviewer signs off for Japanese sits in one file. A change to a slot bumps that call site's prompt version, as `ENRICHMENT_PROMPT_VERSION` does now, and the pull request records a live evaluation run. A fluent reader reviews each language's file before it ships.

**Evaluation.** Each language has a fixture of at least twenty cases per slot beside its prompts, with expectations, and leads with its traps: 上手 read じょうず and うわて, 行 háng and xíng, за́мок and замо́к. `pnpm --filter @lymi/web eval:languages --language zh` calls the model and saves its replies; a unit test rescores the saved run with `checks` on every CI run, as `evaluate.ts --from` already can, so a check or prompt change that breaks a recorded reply fails without a model call.

### Tests that hold it together

- **Conformance.** One test runs every record through its own fixture: aligning a reading and joining the text gives the term back; formatting parsed example readings gives the text back; stripping gives the plain text; the duplicate key is the same for NFC and NFD, for katakana and hiragana, for tone numbers and marks; `spoken` is never empty; each script has a face token; beginner decks are not empty.
- **Coverage.** `pnpm check:languages` fails when a supported tag lacks its server prompt module, evaluation fixture, voice, site content module, or `<tag>.md` in each verify skill's features.
- **No new comparisons.** A Grit plugin fails on a language-code literal compared, cased, or tested with `includes` or `has` outside `packages/core/src/languages/`, and the check names the index function to call instead. Data tables keyed by language, such as the speech locale maps, are not comparisons. Both rows join CLAUDE.md's Enforced rules.

### When a bespoke feature is worth it

Build one only when all hold:

1. The generic path is wrong for this language, not merely plainer: a wrong reading, a merged duplicate, a mispronounced word, a lost field.
2. Learners of the language already rely on it: textbooks print it, or learners pay for it elsewhere.
3. It plugs into an existing extension point, or the new point names a second language that will use it.
4. It ships with conformance fixtures, evaluation cases and a verify feature.
5. It needs no setting.

A feature that only adds decoration fails the first test, as tone colour did in the Chinese proposal. A language joins the list only when it meets every line of full support, and one language is in delivery at a time.

### One page template

`LanguagePage` in `apps/site/src/components/landing/LanguagesView.tsx` becomes the template, absorbing `JapaneseView`'s deck path and row of published decks, rendered per request through `resolveLanguageDecks` from the record's beginner decks. A language supplies `apps/site/src/languages/<tag>.ts`: its hand, voice words, class deck, questions, its showpiece section, and every headline as its own message, because Ukrainian and Russian inflect a language's name and the template never builds a sentence around one. One route per locale, `languages/[language].astro`, serves every supported language and 404s for the rest. Estonian keeps its page until it is supported.

### Instrumentation

The question: does each supported language keep its learners reviewing, and does recall hold once the reading leaves the cue? `review_graded` keeps `reading`, `example_readings` and `readings_faded` for any language that draws a reading, with `reading_language` as the Chinese proposal adds; its values come from `SupportedTag`, so the property can never carry free text. Japanese charts add `reading_language=ja` when Chinese starts sending.

## Delivery

1. The record and index with Japanese alone, every helper and the phone face reading them, the Grit rule on new lines; behaviour unchanged.
2. Japanese's prompt module, with its text moved out of the generic prompts, its evaluation fixture and the rescoring test.
3. Faces as tokens, the conformance test and `pnpm check:languages`.
4. The page template and route, with Japanese moved onto it.
5. Chinese as the second record, through its proposal's slices and page.
6. Korean, then Russian and Ukrainian, each with its own proposal.

## Open questions

1. The word: **Supported language**, as leaned, or "first-party language"? "Supported" may read on the site as if other languages are not.
2. Who reviews each language's prompts and evaluation? Russian and Ukrainian have a reviewer at hand; Japanese, Chinese and Korean need one.
3. Should a live evaluation run gate every prompt change, as leaned, or run weekly with only the recorded rescoring in CI?
4. Should the Grit rule also fail on today's comparisons in `apps/site`'s landing code, or only on new lines until the template replaces them?
5. Does Korean need a reading at all? Hangul shows its sound; the guide now asks for Revised Romanization, which beginners outgrow. Hangul with its sound changes (학교 [학꾜]) may be the real need.
6. Do the voices read stress marks (U+0301) as stress, or must `spoken` strip them for Russian and Ukrainian?
7. Should Japanese's own sections (the return lane, 日 with seven readings) survive the move to the template as its showpiece?
