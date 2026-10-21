---
status: exploration
date: 2026-10-19
decision: none
---

# Chinese

A beginner learning Mandarin should find that Lymi just works, as it now does for Japanese: hanzi arrive with pinyin, pinyin fades as words are learned, audio says the word right, and an HSK deck from Anki or a Pleco export arrives whole. Chinese is the second [supported language](supported-languages.md) and is that proposal's slice 5; this file holds only what is particular to Chinese. Not decided: polyphones in audio, the HSK 3 deck and traditional editions, and the order of Chinese's slices (see Open questions).

## Evidence

Market, as of 2026-10: Duolingo's 2025 Language Report names Chinese the fastest-growing language in 12 countries. The 2021 standard behind HSK 3.0 has about 11,000 words over nine levels, against 5,000 over HSK 2.0's six. Chinese learners already pay for script-specific tools: Skritter, HelloChinese, and Pleco's add-ons.

Today's code:

- `packages/core/src/reading.ts` calls a Chinese card's pronunciation Reading and `cueKeepsReading` shows it as a line on the cue until Known. Nothing is drawn over hanzi: `DRAWN` and `INLINE` are kana-only.
- `readingKey` is Japanese-only, so 行 read háng (a row) and 行 read xíng (to go) are duplicates.
- The enrichment guide writes pinyin with tone marks but none in examples, and the Anki adapter strips example pinyin (`我[wǒ]` → `我`).
- Audio speaks the hanzi; `publishedLocale` in `apps/web/src/server/ai/speech.ts` reaches `cmn-TW` only for that exact tag, so `zh-TW` and `zh-Hant` cards get a mainland voice.
- `chinese-hsk-1-vocabulary` and `chinese-hsk-2-vocabulary` are published and follow the 2025 syllabus (`apps/site/src/lib/exams.ts`), and Welcome offers them through `BEGINNER_DECKS` in `packages/client/src/welcome.ts`. No HSK 3 deck is published.

No HSK Anki deck or Pleco export has been test-imported yet.

## Decision

- **Record.** A Chinese record in `packages/core/src/languages/` on the over-the-script engine, one syllable per character. Every `zh` tag but `zh-yue`, `zh-HK` included, resolves to it; `yue` and `zh-yue` are Cantonese and out of scope. The script comes from the script subtag, else traditional for `zh-TW`, `zh-HK` and `zh-MO`, else simplified.
- **Reading.** Pinyin with tone marks in citation tones, as CC-CEDICT and Pleco write them, so 你好 is nǐ hǎo and 不是 is bù shì; tone sandhi is the voice's job, not the text's. Tone numbers become marks through `normalizeCardText`. Examples carry pinyin in the notation Anki's Chinese decks already use, `你好[nǐ hǎo]`, which the record's bracket pattern describes.
- **Pinyin over the hanzi.** Replaces the cue's line, through `TermText`: over the term while the card is New or Learning, gone once it is Known; always over the term in the answer. The reading splits at spaces and apostrophes, or by pinyin's closed syllable list when written solid (xuéxí), and each Han character takes one syllable. An erhua 儿 shares the syllable before it (一点儿, yīdiǎnr), and letters and digits stay plain (卡拉OK). When the counts do not fit, the reading goes over the whole term. CONTEXT.md gains the Chinese half of Reading when this lands.
- **Examples.** Drawn through `ExampleText`, pinyin fades where a character and its syllable match one of the learner's Known cards. The pair is one character, not a word, because a character keeps its reading across words: a Known 银行 fades 行 háng in 行长 but never 行 xíng in 不行. `readingPairs` learns that pair; `known-readings.ts` is otherwise unchanged.
- **Duplicates.** The Chinese `readingKey` folds the pinyin to NFC, lower case and marks, without spaces or apostrophes, and keeps tones, so 行 háng and 行 xíng are two words and so are 东西 dōngxi (a thing) and dōngxī (east and west). Pinyin with no tone mark gives no key and matches either. 学习 and 學習 are different terms; Lymi never converts between scripts.
- **Faces.** A face token per script, Hans (PingFang SC, Microsoft YaHei, Noto Sans SC) and Hant (PingFang TC, Microsoft JhengHei, Noto Sans TC), so a shared character never takes its Japanese form. No web font.
- **Audio.** Spoken from the hanzi, which voices read with sandhi; they read pinyin text poorly. Traditional tags speak with the Taiwan voice. A recording from an import is never replaced.
- **Prompts.** The zh module's enrich slot writes example pinyin with a worked example, and the AI adds it to a learner's example only when the text without brackets is unchanged. Fixtures lead with the traps: 行, 长, 还, 东西, erhua, and 一 and 不 in citation tones.
- **Import.** From an HSK Anki deck: the pinyin field becomes the Reading without its tone-colour markup, a numbered pinyin field beside it is dropped, a traditional-form field becomes a notes line, and sentence pinyin becomes inline readings when it fits one syllable per character. A Pleco export (lines of `简体[繁體]`, pinyin and definition under `//` category lines) gets its own adapter under `apps/web/src/server/imports/`: the term in the script the learner picks, the other script as a notes line, and each category as a tag.
- **Page.** The showpiece is the 行 pair: a Known 银行 fading 行 háng in 行长 but not 行 xíng in 不行.
- **Left out.** Tone colour, which fails the bespoke-feature rule's first test; zhuyin; script conversion; stroke order and writing; measure-word drills; typed or handwritten answers; sentence audio.

## Delivery

Each slice builds on supported-languages slices 1–4: the record index, `TermText` and `ExampleText`, the prompt harness, `normalizeCardText` and the new `readingKey`, the shared page parts and `LanguageOut`.

1. The Chinese record: tag resolution, scripts, syllable alignment, tone-number conversion and the reading key, with its conformance fixture; Hans and Hant face tokens; the Taiwan voice for traditional tags.
2. Pinyin over the term on the web and the phone.
3. The zh prompt module, reviewed by a fluent reader, with a recorded run.
4. Example pinyin fading over Known characters on the web and the phone. The Worker strips the notation from older phones until the minimum supported version draws it.
5. Import fidelity: test-import one HSK Anki deck and one Pleco export, then the Anki field mapping and the Pleco adapter.
6. A beginner's start, the page and the `LanguageOut` entry: Welcome offers a Chinese learner HSK 1, then HSK 2, and an HSK 3 deck once open question 2 settles it; the page view and showpiece go through `LANGUAGE_PAGES` and `LanguagePage.astro`; `zh` joins `SupportedTag`.

## Instrumentation

The question: do Chinese learners keep reviewing, and does recall hold once pinyin leaves the cue? `review_graded` sends `reading`, `example_readings` and `readings_faded` with `reading_language=zh`. `import_finished` gains `source=pleco` and a `readings_converted` count of tone numbers turned into marks. The welcome offer reuses `welcome_step_finished`.

## Open questions

1. A one-character term with two readings (行, 长, 还): accept the voice's default, or send the pinyin as an SSML phoneme where the provider takes one? Lean: count how often the voice misreads HSK 1–3's polyphones before deciding.
2. The HSK 3 deck: build it from the 2025 syllabus, as HSK 1 and 2 are? Traditional editions of the beginner decks for Taiwan learners now, or later?
3. Import fidelity before example pinyin, or after? Lean: after, since keeping an import's sentence pinyin needs the notation that slice 4 parses.
