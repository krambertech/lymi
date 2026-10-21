---
status: exploration
date: 2026-10-20
decision: none
---

# Cantonese

A learner of Hong Kong Cantonese, often a heritage learner abroad, should find that Lymi works as it does for Chinese: characters arrive with Jyutping that fades as words are learned, audio says the word in Cantonese rather than Mandarin, and a Pleco export or a CantoDict-style Anki deck arrives whole. Cantonese reuses Chinese's per-character engine family, so this file holds only what differs from [Chinese](chinese.md) and [Supported languages](supported-languages.md). Not decided: changed tones in duplicates, Yale, the everyday or textbook 五 in audio, and who reviews the prompts.

## Evidence

Market, as of 2026-10: tens of millions speak Cantonese in Hong Kong, Macau, Guangdong and abroad, yet it has few self-study tools; Duolingo teaches it only from Mandarin. Learners already read Jyutping in Pleco, words.hk and CantoDict.

Today's code:

- `yue` resolves to no record, and `languageSupport` deliberately refuses `zh-yue`, so a Cantonese card shows its pronunciation as a line, gets no reading key, and keeps 行 hong4 and 行 hang4 as one word.
- Speech: `zh-yue` reaches `cmn-CN` through `publishedLocale`'s root fallback, so it speaks Mandarin. `yue` has no Gemini, ElevenLabs or OpenAI locale and speaks only through Chirp's `yue-HK`, and only when Google Cloud credentials are set.
- Fonts: the `:lang(zh)` rules in `packages/design/tokens.css` exclude `zh-yue`, and nothing matches `yue`, so its characters take whichever CJK face the platform picks first.
- The Pleco adapter's detection accepts tone numbers 0 to 5, so a Jyutping export with tone 6 is not recognised, and it tags every deck `zh`.

## Decision

- **Record.** A Cantonese record in `packages/core/src/languages/` on the over-the-script engine, one syllable per character. Only `yue` and `zh-yue`, with any subtags, resolve to it; `zh-HK` stays Chinese, since the tag decides and a Hong Kong Mandarin learner uses it too. The script comes from the script subtag, else simplified for `yue-CN`, else traditional.
- **Reading.** Jyutping with tone numbers 1 to 6 after each syllable, as the LSHK scheme, learners and dictionaries write it, so 你好 is nei5 hou2. Numbers stay numbers: there are no tone marks to convert to. The only conversion is raised tone numbers to digits (nei⁵ → nei5), and only when the result is toned Jyutping, so IPA with Chao tone numbers stays as written. Yale, with its different initials and finals, is left alone and gets no key.
- **Tone digits raised in display.** Drawn as superscripts, gwong² dung¹, while the stored text, the API and the notation keep plain digits, gwong2 dung1. A raised digit reads as a tone rather than as part of the syllable, and it shortens the reading over each character. It is styled rather than written as a Unicode superscript, since Onest has ¹²³ but not ⁴⁵⁶: on the web a smaller run lifted in the `rt`, and on the phone, which cannot lift a run inside a line, the digit is its own text at the top of the reading's row.
- **Syllables.** A closed list built from initials and finals by class, with m and ng as syllabic nasals (唔 m4, 五 ng5). A reading is folded with NFKC, so raised and full-width tone numbers count, then splits at spaces and hyphens, after each tone number, then by the list, longest first.
- **Jyutping over the characters.** Through `TermText`, shown and faded as for Chinese, at 0.4 of the term's size and never over the 15.5 px lede, as every reading in letters is, since half size suits kana but lets several letters a character prise a big term apart. Each Han character takes one syllable, counted by code point, so 𨋢 lip1 in 搭𨋢, outside the Basic Multilingual Plane, is one. Letters take a syllable each or one for the run when the reading says them (T恤, ti1 seot1), else stay plain (卡拉OK, kaa1 laa1 OK); there is no erhua. When the counts do not fit, the reading goes over the whole term.
- **Colloquial characters.** 嘅, 咗, 唔, 冇, 啲 and 佢 are ordinary Han characters to the engine. They matter in prompts, which write written Cantonese (佢食咗飯), not Standard Written Chinese (他吃了飯), and in the face, which must cover the Hong Kong Supplementary Character Set.
- **Polyphones.** The reading key keeps tones, so 行 hong4 (a row, 銀行) and 行 hang4 (to walk, 行路) are two words, as are 長 coeng4 and zoeng2. A changed tone (女 neoi5, 仔女's neoi2) is kept, since dictionaries list it as its own reading. A key needs a tone on every character's syllable and a reading that fits the term, so a toneless reading, Yale, pinyin or IPA never splits a word.
- **Examples.** The notation is `你好[nei5 hou2]`, the bracket reading as many Han characters before it as it has syllables; a bracket is read only when every syllable has a tone, so `[OK]` never covers a character. Jyutping fades where a character and its syllable match a Known card's pair, `jyutping:行[hong4]`, so a Known 銀行 fades 行 in 行業 but never in 行路.
- **Face.** The traditional face Chinese uses (PingFang TC, Microsoft JhengHei, Noto Sans TC) through a `:lang(yue)` rule, and the simplified face for `yue-Hans` and `yue-CN`. No web font.
- **Audio.** Spoken from the characters in a Hong Kong Cantonese voice, never routed through a `zh` fallback. The voice and why are under Voice below.
- **Prompts.** A yue module whose enrich slot writes Jyutping with tone numbers and examples in written Cantonese with inline Jyutping. Fixtures lead with the traps: 行, 長, 樂, 好 hou2 and hou3, a changed tone, 唔 and 冇, and a Standard Written Chinese sentence that should come back colloquial.
- **Imports.** Pleco: detection accepts tone 6 and marks the deck `yue` when every reading is toned Jyutping and at least one is not pinyin, otherwise it stays `zh`. CantoDict-style Anki decks (traditional, simplified, Jyutping, often Yale and English): the Jyutping field becomes the Reading, the simplified field a notes line, Yale is dropped, and sentence Jyutping becomes inline brackets when it fits one syllable per character.
- **Left out.** Tone colour, Yale and any conversion between romanisations, Cantonese Pinyin, script conversion, and recognising Cantonese on a `zh-HK` card.

## Voice

ElevenLabs `eleven_v4` with the library voice Aki (`xDISamJf8LV5rG5A2te1`) and `language_code: "yue"`, with Gemini 3.1 Flash TTS (Kore, `yue-HK`) as the fallback. Measured on 14 clips (24 syllables) of the traps, each judged blind and informed by Gemini Flash and checked by OpenAI's audio models, as of 2026-10:

| Voice | Syllables right | Notes |
| --- | --- | --- |
| **Aki** (ElevenLabs) | 23/24 | 五 said m5, the common Hong Kong merger; every colloquial character right in two takes |
| Felix Chung, Alan (ElevenLabs) | 23/24 | Alan unstable across takes; Felix is the backup if Aki leaves the library |
| Ashley Y, Chloe Chan (ElevenLabs) | 22, 21/24 | 𨋢 wrong in both takes |
| **Kore**, Gemini 3.1 Flash TTS | 18/19 on 11 clips | Says 五 as textbook ng5; free-tier quota stopped the rest; 2.7 s against Aki's 0.6 s |
| OpenAI `gpt-4o-mini-tts`, told to speak Cantonese | 17–18/24 | 搭𨋢 misread |
| Amy, Ling (today's Mandarin voices) | 9/24 | Mandarin readings, which is what `zh-yue` gets today |

Gemini's 3.8 Flash TTS models, the only ones whose docs list Cantonese, read the app's instruction prompt aloud, so they stay out until that prompt changes. `speech.ts` must learn `yue` → `yue-HK`, since `createSpeechProviders` looks for an ElevenLabs voice only once Gemini has a locale. A fluent listener should confirm Aki before `yue` joins `SupportedTag`.

## Delivery

1. The Jyutping engine in `packages/core/src/jyutping/`: the syllable list, splitting, alignment, the bracket notation, the reading key and the Known pair. This proposal.
2. The record and its tag resolution, the reading engine and its conversion slot in `card-text.ts`, the reading key and pairs in `reading.ts`, the conformance fixture, the face, the voice, and Jyutping over the term on the web and the phone.
3. The yue prompt module with a recorded evaluation run, reviewed by a fluent reader; example Jyutping fading over Known characters, stripped for older phones until the minimum supported version draws it; the `LanguageOut` entry and verify features.
4. Imports: the Pleco detection and a CantoDict-style Anki deck, after test-importing one of each.
5. The page and a beginner start; `yue` joins `SupportedTag`.

## Instrumentation

The question: do Cantonese learners keep reviewing, and does recall hold once Jyutping leaves the cue? `review_graded` sends `reading`, `example_readings` and `readings_faded` with `reading_language=yue`. Imports add no property.

## Open questions

1. Should a changed tone fold into the base tone for duplicates, merging 女 neoi5 and neoi2, as 一 and 不 fold for Chinese? Lean: no, since unlike sandhi a changed tone is lexical.
2. Should Lymi convert Yale with tone numbers to Jyutping on write? Lean: no, since tone-mark Yale and its h for low tones make the input ambiguous often enough.
3. Who reviews the yue prompts? They need a fluent reader of written Cantonese before `yue` joins `SupportedTag`.
4. Beginner decks: is there a syllabus worth following, or does the first deck come from frequency in written Cantonese?
5. Aki says 五 as m5, as most Hong Kong speakers do; Gemini's Kore says the textbook ng5. Does the learner hear the everyday form or the dictionary's?
6. Should Cantonese get its own Hong Kong face (PingFang HK, Noto Sans HK), whose glyphs follow Hong Kong's standard forms where they differ from Taiwan's? It needs a face token that is not a script.
