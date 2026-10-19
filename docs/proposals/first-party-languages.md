---
status: exploration
date: 2026-10-19
decision: none
---

# Supported languages

A learner of Japanese now finds that Lymi just works: readings over kanji that fade as words become Known, audio that says the word right, imports that arrive whole, beginner decks at Welcome and a page at `lymi.app/languages/japanese`. Lymi should give a short list of languages that treatment, each with features made for it that other apps lack, without a mode or a setting and without language checks spread through the code. The card's language tag still decides everything, and every other language keeps working as it does today. This proposal sets the architecture each such language plugs into. [Japanese](japanese.md) is the first and Chinese, in its own proposal, the second. Not decided: the open questions at the end.

## Evidence

Demand, as of 2026-10: Duolingo's 2025 Language Report ranks Japanese 4th, German 5th and Korean 6th, and names Chinese the fastest-growing in 12 countries. The MLA counted US college enrolment in Korean up 38% from 2016 to 2021.

Language behaviour today, on `main` at f0a4809f:

| Concern | Where it is decided |
| --- | --- |
| Readings drawn, field called Reading, cue keeps pinyin, duplicate key | `DRAWN = new Set(["ja"])`, `["ja", "zh"]`, `=== "zh"`, `!== "ja"` in `packages/core/src/reading.ts:22`, `:168`, `:79`, `:57` |
| Fields the AI fills by default | `READING_LANGUAGES`, `FORM_LANGUAGES` in `packages/core/src/enrichment.ts:35` |
| Prompts | `GUIDES` in `apps/web/src/server/enrichment/languages.ts:7`; Japanese inside generic prompts at `apps/web/src/server/enrichment/prompt.ts:55`, `:95`, `apps/web/src/server/lessons/prompt.ts:24`, `apps/web/src/server/services/hook-draft.ts:46` |
| AI checks and evaluation | `apps/web/src/server/enrichment/checks.ts:152`; `evaluation.json` through `eval:enrichment` |
| Speech | `kanaReading(card) ?? card.term` in `apps/web/src/server/services/audio.ts:234`; Korean has a voice but is not a default, `apps/web/src/server/ai/speech-voices.ts:33` |
| Fonts | `:lang(ja)` in `packages/design/tokens.css:312`; `=== "ja"` in `apps/mobile/src/ui/primitives.tsx:97` |
| Import | kana kept, pinyin dropped, in `apps/web/src/server/imports/anki/index.ts:436` |
| Beginner decks | `BEGINNER_DECKS` in `packages/client/src/welcome.ts:22` |
| Pages | bespoke `JapaneseView`; Estonian on the shared `LanguagePage` in `apps/site/src/components/landing/LanguagesView.tsx:190` |
| API docs | `pronunciation` is "IPA or a plain respelling" (`apps/site/src/components/docs/pages/Cards.tsx:9`); the duplicate rule omits the reading (`:171`); `packages/core/src/types.ts:614` describes no format, and `:617` names Japanese |

About ten client files branch on the reading helpers, such as `apps/web/src/client/views/review-view.tsx:528` and `apps/mobile/src/app/review.tsx:1293`. A new language today means another literal in each helper and another sentence in each generic prompt, and no client can ask a language's format.

## Decision (leaning)

**The word.** CONTEXT.md gains **Supported language**: a language Lymi treats in full, whose readings, audio, duplicates, fonts, AI text, imports, beginner decks and public page follow its own rules. The card's language tag makes a card one; no setting turns it on. _Avoid_: first-party language, featured language, native language, profile, mode. "Native language" and "Profile" are already avoided under Meaning language and Style, so the code type is `LanguageSupport`.

**Full support** means, on the web and the phone: the pronunciation is stored and drawn in the language's style and fades once Known; speech says it right and never replaces a recording; one term with two readings is two cards; the script draws in its own faces; every AI call site has the language's prompt text and a passing evaluation; an Anki deck and the language's dominant tool import whole; Welcome offers beginner decks; the API and docs state its format; web and phone verify features drive it; `review_graded` reports it; and its page exists in all three site locales.

**Pronunciation and Reading.** A card has one `pronunciation` field. For a script that does not show its sound it holds a Reading and the form labels it Reading; otherwise it holds IPA or a respelling. The language's record declares the label and the format. Example readings stay inline in `example`, `毎朝[まいあさ]パンを食[た]べます。`, never in a field of their own, so each stays attached to its kanji; `parseReadings` and `stripReadings` serve drawing, fading and plain text.

**Configuration chooses, code draws.** Four tiers:

- **Any language**: nothing added.
- **Configured**: data and small pure functions in a record. Korean, German, Estonian.
- **Engine**: shared code with a renderer on the web and the phone. Japanese, Chinese, Russian and Ukrainian.
- **Platform**: app-wide right-to-left layout or word breaking, before anything else. Arabic, Hebrew, Thai.

Records are TypeScript, not JSON or database rows: they hold functions, are type-checked, ship in the phone for offline review, and change with a test. Engines come in two families in `packages/core/src/readings/`: **over the script** (furigana; one syllable per character for pinyin now and Cantonese jyutping later) and **marks in place**, where the pronunciation is the term plus marks, drawn until Known, and stripping the marks gives the term back (Russian and Ukrainian stress, Arabic harakat, Hebrew niqqud).

**The record.** `packages/core/src/languages/` holds one file per supported language and an index, the only place a language code is compared:

```ts
interface LanguageSupport {
  tag: SupportedTag;                 // primary subtag
  pronunciation: { label: "reading" | "pronunciation"; format: Format };
  engine?: Engine;                   // over the script, or marks in place
  script(tag: string): Script;       // zh-TW → "Hant"
  readingKey(reading: string): string | null;
  spoken(card: CardText): string;
  beginnerDecks: readonly string[];
  exampleReadings?: ExampleReadings; // fade over Known pairs
}
```

Shared code asks the index, never a code: `drawsReading(tag)`, `readingKey(card)`, `spokenText(card)`, `script(tag)`. A tag without a record answers as today; the plain `GUIDES` and default-field sets stay for every other language. Bespoke features plug in only at named points: an engine, example readings, a `--font-script-<script>` face token that the web's `:lang()` rules and the phone's generated tokens both read, prompt slots, import rules or an adapter (such as Pleco), and the language's page.

**Prompts.** `apps/web/src/server/languages/<tag>.ts` holds the voice and one slot per AI call site: `enrich` (the guide), `addReadings` (with its worked example, out of the generic prompt), `lesson` for Smart add, `hook`, `detect` for import, and `checks`, code holding the AI to the guide. Generic prompts say "the language guide" and never a language. A fluent reader reviews each file; a change bumps the call site's prompt version and records a live evaluation run. Each language has twenty or more cases per slot, led by its traps (上手 じょうず and うわて, 行 háng and xíng, за́мок and замо́к); `eval:languages --language zh` saves the model's replies, and CI rescores the saved run with `checks`, as `evaluate.ts --from` already can.

**Data model.** No new table, column or migration. Learner data stays in D1: `cards.language`, `pronunciation`, `example`, `notes` and their `*_source`; `decks.default_language` is only a default; `user_settings.meaning_language`. Audio stays in R2 behind `audio_key`, with `audio_source` recorded or generated. Language rules live in code: records, engines, prompt modules, face tokens. Derived and never stored: alignment, the duplicate reading key (compared in code after the `cards_user_lang_norm_idx` lookup), Known pairs on the device, and the script from the tag. `reviews` stores nothing about readings.

**API and docs.** `pronunciation` stays the only field, with no `reading` alias, so frozen phone contracts are untouched. `GET /api/languages` and an MCP `list_languages` are generated from the records: label, format with an example, example notation, duplicate rule and script; `list_decks` can carry each deck's entry. A write converts only unambiguous input (tone numbers to marks; `食[た]べる` in a term splits into term and Reading), returns the stored form, and never rejects a card for its format. Examples are returned in raw inline notation and clients strip the brackets. A generated `/docs/languages` page replaces language names in schema descriptions, and MCP instructions gain one line pointing to it.

**Pages.** Each supported language has its own page, because each language's best demonstration differs. Shared parts: the shell and navigation, locale routing, the published-deck row through `resolveLanguageDecks`, the beginner path from the record, voice samples, the questions block, and every headline as its own message, since Ukrainian and Russian inflect a language's name. Each page brings its hero and showpiece: Japanese's return lane and 日 with seven readings; a Known 银行 fading 行 háng in 行长 but not 行 xíng in 不行; за́мок against замо́к.

**Enforcement**, both rows added to CLAUDE.md's Enforced rules:

- One conformance test runs every record through its fixture: aligning then joining gives the term back, formatting parsed readings gives the text back, stripping marks gives the term, the reading key is stable across NFC and NFD, kana forms and tone notations, and `spoken` is never empty.
- `pnpm check:languages` fails when a supported tag lacks its prompt module, evaluation fixture, voice, face token, docs section, page, or verify feature on either skill.
- A Grit plugin fails on a language-code literal compared, cased or tested with `includes` or `has` outside `packages/core/src/languages/`, naming the index function to use. Tables keyed by language are not comparisons.

**When a bespoke feature is worth it.** All of: the generic path is wrong for the language, not merely plainer; learners already rely on it, in textbooks or tools they pay for; it fits an existing extension point, or the new point names a second language that will use it; it ships with fixtures, evaluation cases and a verify feature; and it needs no setting. Tone colour fails the first test. A language joins only when it meets every line of full support, and one is in delivery at a time.

**Instrumentation.** The question: does each supported language keep its learners reviewing, and does recall hold once the reading leaves the cue? `review_graded` keeps `reading`, `example_readings` and `readings_faded` for any language that draws one, with `reading_language` from the Chinese proposal typed as `SupportedTag`. Japanese charts add `reading_language=ja` when Chinese starts sending.

**Roster.**

| Language | Tier | What it gets |
| --- | --- | --- |
| Japanese | Engine | Done |
| Chinese | Engine | Per-character pinyin, Pleco import, HSK decks |
| Korean | Configured | Pronounced Hangul where the spelling differs, Sino-Korean roots in notes, a default voice, Hangul and TOPIK I decks |
| Russian, Ukrainian | Engine | Stress marks in place, search that ignores stress |
| German | Configured | Article and plural with the noun |
| Estonian | Configured | Principal forms |
| Arabic | Platform, then engine | Right-to-left first, then harakat; the tag's dialect picks the voice |
| Later | | Cantonese, Hebrew, Thai; Spanish, French and Portuguese regions as configuration only |

## Delivery

1. The record and index with Japanese alone, every reading helper and the phone face reading them, the Grit rule on new lines; behaviour unchanged.
2. Japanese's prompt module, its text moved out of the generic prompts, its evaluation fixture and the rescoring test.
3. Face tokens, the conformance test and `pnpm check:languages`.
4. The shared site parts, `GET /api/languages`, `list_languages` and `/docs/languages`.
5. Chinese, through its proposal's slices and page.
6. Korean, then Russian and Ukrainian, each with its own proposal.

## Open questions

1. The word: **Supported language**, or "first-party language"? "Supported" may read on the site as if other languages are not.
2. Who reviews the Japanese, Chinese and Korean prompts?
3. Should a live evaluation gate every prompt change, or run weekly with only the rescoring in CI?
4. Should the Grit rule fail on today's comparisons in the site's landing code, or only on new lines?
5. Is a stress or vowel mark a Reading on the form, or does it need a label of its own?
6. Should the API also return a plain copy of the example?
7. Does German's duplicate key ignore the article, so "der Tisch" matches "Tisch"?
8. Do the voices read stress marks (U+0301) as stress, or must `spoken` strip them?
