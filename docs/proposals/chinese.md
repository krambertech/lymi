---
status: exploration
date: 2026-10-19
decision: none
---

# Chinese

A beginner learning Mandarin should find that Lymi just works, as it now does for Japanese: hanzi arrive with pinyin, pinyin fades as words are learned, audio says the word right, and an HSK deck from Anki or a Pleco export arrives whole. The card's language tag drives all of it; there is no Chinese mode and no setting. Not decided: tone colour, how example pinyin fades, polyphones in audio, the HSK 3 deck, and the order of slices 4 and 5 (see Open questions).

## Evidence

Market, as of 2026-10: Duolingo's 2025 Language Report names Chinese the fastest-growing language in 12 countries. The 2021 standard behind HSK 3.0 has about 11,000 words over nine levels, against 5,000 over HSK 2.0's six. Chinese learners already pay for script-specific tools: Skritter, HelloChinese, and Pleco's add-ons.

Today's code, on `main` at f0a4809f:

- `packages/core/src/reading.ts`: `writtenWithReading` includes `zh`, so the card form calls a Chinese card's pronunciation Reading, and `cueKeepsReading` shows it as a line on the cue until Known. Nothing is drawn over hanzi: `DRAWN` and `INLINE` are kana-only.
- `readingKey` is Japanese-only, so 行 read háng (a row) and 行 read xíng (to go) are duplicates.
- The enrichment guide (`apps/web/src/server/enrichment/languages.ts`) writes pinyin with tone marks but none in examples, and the Anki adapter strips example pinyin (`我[wǒ]` → `我`).
- Audio speaks the hanzi; `publishedLocale` in `apps/web/src/server/ai/speech.ts` reaches `cmn-TW` only for that exact tag, so `zh-TW` and `zh-Hant` cards get a mainland voice.
- `packages/design/tokens.css` names faces for `:lang(ja)` only.
- `chinese-hsk-1-vocabulary` and `chinese-hsk-2-vocabulary` are published and follow the 2025 syllabus (`apps/site/src/lib/exams.ts`); `BEGINNER_DECKS` in `packages/client/src/welcome.ts` has only `ja`.

No HSK Anki deck or Pleco export has been test-imported yet.

## Decision

- **Fields.** No new ones. The term is in hanzi, in the deck's script. Its Reading is pinyin with tone marks in citation tones, as CC-CEDICT and Pleco write them, so 你好 is nǐ hǎo and 不是 is bù shì; tone sandhi is the voice's job, not the text's. Tone numbers (`ni3 hao3`) from an import or a learner become marks on save. Examples carry pinyin inline in the notation Anki's Chinese decks already use, `你好[nǐ hǎo]`; plain-text uses strip the brackets.
- **Pinyin over the hanzi.** Replaces the cue's line: over the term while the card is New or Learning, gone once it is Known; always over the term in the answer. The reading splits at spaces and apostrophes, or by pinyin's closed syllable list when written solid (xuéxí), and each Han character takes one syllable. An erhua 儿 shares the syllable before it (一点儿, yì diǎnr), and letters and digits stay plain (卡拉OK). When the counts do not fit, the reading goes over the whole term, as for Japanese. CONTEXT.md gains the Chinese half of Reading when this lands.
- **Examples.** Pinyin over an example's hanzi fades where the character and its syllable match one of the learner's Known cards. A pair is one character, not a word, because a Chinese character keeps its reading across words: a Known 银行 fades 行 háng in 行长 but never 行 xíng in 不行. `packages/client/src/known-readings.ts` works unchanged; only `readingPairs` learns the Chinese pair. The AI writes and adds example pinyin under the Japanese rule.
- **Tones.** Marks always; no tone colour now. A mark carries the tone in both palettes and to every learner, so colour could only repeat it; apps disagree on which colour means which tone; and five tones would need five new tokens in each palette.
- **Duplicates.** `readingKey` gives a Chinese key: the pinyin in NFC and lower case, tone numbers as marks, spaces and apostrophes removed, tones kept, so 行 háng and 行 xíng are two words and so are 东西 dōngxi (a thing) and dōngxī (east and west). A reading with no tone mark at all counts as no reading and matches either, through the existing `sameReading`. 学习 and 學習 are different terms; Lymi never converts between scripts.
- **Script and fonts.** From the tag: `zh`, `zh-CN`, `zh-SG` and `zh-Hans` are simplified; `zh-TW`, `zh-HK` and `zh-Hant` are traditional. `:lang(zh)` names simplified system faces (PingFang SC, Microsoft YaHei, Noto Sans SC) and `:lang(zh-Hant)`, `:lang(zh-TW)` and `:lang(zh-HK)` traditional ones, so a shared character never takes its Japanese form. No web font. The AI writes in the deck's script.
- **Audio.** Spoken from the hanzi, which voices read with sandhi; they read pinyin text poorly. Traditional tags speak with the Taiwan voice. A recording from an import is never replaced. Cantonese (`yue`) is a separate language and out of scope.
- **Import.** From an HSK Anki deck: the pinyin field becomes the Reading without its tone-colour markup, a numbered pinyin field beside it is dropped, a traditional-form field becomes a notes line, and sentence pinyin becomes inline readings when it fits one syllable per character. A Pleco export (lines of `简体[繁體]`, pinyin and definition under `//` category lines) gets its own adapter: the term in the script the learner picks, the other script as a notes line, tone numbers as marks, and each category as a tag.
- **Left out.** Zhuyin, tone colour, script conversion, character-writing and stroke order, measure-word drills, typed or handwritten answers, and sentence audio.

## Delivery

1. Correctness: the Chinese duplicate key, tone numbers to marks, the Taiwan voice for traditional tags, and `:lang(zh)` fonts.
2. Pinyin over the term on the web, with syllable splitting and alignment in `packages/core/src/reading.ts`; `cueKeepsReading` retires.
3. Pinyin over the term on the phone.
4. Import fidelity: test-import one HSK Anki deck and one Pleco export, then the Anki field mapping and the Pleco adapter.
5. Example pinyin, written by the AI and kept from imports, fading over Known characters on the web and the phone.
6. A beginner's start: Welcome offers a Chinese learner HSK 1, HSK 2 and a new HSK 3 deck from the 2025 syllabus.

## Instrumentation

The question: do Chinese learners keep reviewing, and does recall hold once pinyin leaves the cue? `review_graded` sends `reading`, `example_readings` and `readings_faded` for Chinese cards as it does for Japanese, plus a new `reading_language` (`ja` or `zh`) so the two chart apart. `import_finished` gains `source=pleco` and a `readings_converted` count of tone numbers turned into marks. The welcome offer reuses `welcome_step_finished`.

## Open questions

1. Tone colour: leave it out, as proposed, or add it later as a tint over marks that stay?
2. Example fading: per character, as proposed, or per word, as Japanese does?
3. A one-character term with two readings (行, 长, 还): accept the voice's default, or send the pinyin as an SSML phoneme where the provider takes one? Lean: count how often the voice misreads HSK 1–3's polyphones before deciding.
4. The HSK 3 deck: build it from the 2025 syllabus, as HSK 1 and 2 are? Traditional editions of the beginner decks for Taiwan learners now, or later?
5. The order of slices 4 and 5.
