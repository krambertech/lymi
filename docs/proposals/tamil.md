---
status: exploration
date: 2026-10-20
decision: none
---

# Tamil

A heritage learner who speaks Tamil but cannot read it should see each word's sound in Latin letters over the script, lose that help word by word as the script becomes familiar, and hear the word said right. A beginner gets the same bridge into the script. Tamil is the pilot for Indic scripts (Malayalam, Telugu, Bangla, Punjabi, Hindi later) and becomes a [supported language](supported-languages.md) on a third engine family; this file holds only what is particular to Tamil. Not decided: the letters of the reading, fading over inflected words, and spoken Tamil (see Open questions).

## Evidence

Tamil is an abugida: a consonant carries an inherent a, a vowel sign replaces it, and the pulli (்) removes it. The script does not write voicing, so க is k in கல் (stone), g in மகன் (son) and voiceless again in அக்கா (elder sister); the same holds for ச, ட, த and ப. Voicing follows position almost without exception in native words, and loanwords break it: பஸ் is said bas.

Spoken and written Tamil differ in grammar, not only accent: written போகிறேன் (I am going) is said போறேன். Heritage learners know the spoken forms and meet the written ones in school, books, signs and news. In chat, and in phone keyboards that turn Latin letters into script, Tamils write Tamil by sound (paadal, Tamizh) with no fixed rule for long vowels.

Today `ta` is an any-language tag, which a separate session is moving to the configured table with a guide and a `Taml` face token. Its speech goes to Gemini's `ta-IN` voice, because `NATIVE_SPEECH_VOICES` has no Tamil entry. Onest's shipped subsets have every Latin letter the reading uses (ā ī ū ē ō ṭ ḍ ṇ ḷ ṅ ñ), checked 2026-10-20.

## Decision (leaning)

- **Engine.** A third family, **word by word**: the reading is worked out from the term's spelling and drawn over each whole word. Over the script fails because letters do not map to syllables of the reading (க்க is one sound, and a stop's sound depends on its neighbours); marks in place fails because there is nothing to mark. `ReadingEngine` gains `indic`, with Tamil's tables and voicing rules in `packages/core/src/indic/`; each later script adds a table, and Hindi a schwa-deletion rule. Tamil writes spaces between words, so the phone needs no `Intl.Segmenter`.
- **The reading.** Lymi's own letters: ISO 15919's long vowels with a macron and retroflex consonants with a dot below, zh for ழ and sh for ஷ as Tamils already write them, and each stop voiced as said: பாடல் pāḍal, தங்கம் taṅgam, மஞ்சள் mañjaḷ, காற்று kātru, ஒன்று ondru. Plain ISO 15919 writes letters, not sounds, so a heritage learner hears its pāṭal as another word, and its ḻ means nothing to them. Chat spelling (paadal) is familiar but varies from writer to writer and drops the retroflex. Marks stay legible at reading size, as pinyin's do. ற and ர are both r, and ந and ன both n, because speakers no longer tell them apart.
- **Generated, not stored.** The reading comes from the spelling at display, so every imported, old and AI-written card has one, and the scheme can change without a backfill. The pronunciation field, labelled Reading, holds Latin letters only for a word said against the rule, such as பஸ் bas, and its format says so. Such a reading is drawn only when it has as many words as the term and each is within a letter in three of the spelling's reading, so a hint or a gloss is never drawn; IPA or Tamil script is ignored too. `normalizeCardText` empties a pronunciation that only repeats the generated reading, comparing without marks or doubled vowels so chat spelling (paadal) counts as a repeat. Duplicates compare the term alone, because one spelling gives one reading.
- **Drawing.** Over each word, through pinyin's ruby component and its gap between Latin readings. Tamil's vowel signs reach above and below the line (ி ு ூ), so line height is checked on both platforms. The reading draws in Onest; the term in the `Taml` face (Tamil Sangam MN, Nirmala UI, Noto Sans Tamil), with no web font.
- **Fading.** The term follows furigana's and pinyin's rule: the reading sits over it while the card is New or Learning, leaves the cue once it is Known, and stays on the answer. In an example, a word's reading fades when the word as written is a Known card's: the Known pair is the whole word, `indic:வீடு`, since a letter's sound depends on its neighbours. Tamil is agglutinative, so வீட்டில் (in the house) keeps its reading for a learner who knows வீடு. Example readings are generated too, so examples carry no notation, the model never writes one, `EXAMPLE_NOTATION.indic` is null, and older phones have nothing to strip.
- **Diglossia.** Cards hold written Tamil, because the reading aid exists for reading and spoken Tamil has no shared spelling across regions. Where speech differs, enrichment adds a notes line with the spoken form and its reading: Spoken: போறேன் (pōrēn). A learner may still write a spoken form as the term, and the engine reads whatever is spelled. Examples are short written sentences.
- **Voice.** Gemini-TTS's `ta-IN` Kore, which `ta` already reaches; no ElevenLabs entry. On 2026-10-20 each voice said 16 invented traps (ழ, ள, ற, long vowels, voicing, grantha, a sentence) and Gemini 2.5 Flash wrote back what it heard. Kore returned 14; both misses would show on any voice (கறி heard as கரி, which speakers merge, and a written ப் that speech drops). Charon returned 12. ElevenLabs v4 through Devi, Lymi's Hindi voice, returned 11 and lost ழ and ள (பழம் heard as கரம்). The key lacks Voices: read, so ElevenLabs' native Tamil voices were not tried. Speech says the term, which Kore reads; a Tamil speaker listens before slice 3.
- **The bespoke-feature rule.** It passes all five tests. The generic path is wrong, not plainer: it shows script to a learner who cannot read it, and IPA is a second script they cannot read. Learners already write and type Tamil in Latin letters. Malayalam is the second language on the engine, with its own table and no schwa rule. It ships with fixtures, evaluation cases and a verify feature, and needs no setting.
- **Left out.** Typing Latin letters to search Tamil terms, script conversion, handwriting, stem matching for fading, and Sri Lankan forms beyond what `ta-LK` already gets from the same record.

## Delivery

1. This proposal and the engine as pure functions in `packages/core/src/indic/` (#884).
2. Tamil's record replaces its configured row (`RecordTag` gains `ta`, engine `indic`): the reading is drawn over the term and fades on Known on the web and the phone, examples fade over Known words, `normalizeCardText` empties a repeated reading, and both verify skills gain a `tamil` feature. The `ta` prompt module and its recorded runs ship in the same change, because the row's guide told the model to fill every pronunciation: the spoken notes line, readings only for words said against the rule, and fixtures led by the traps (voicing, ற்ற, ழ, grantha letters, the aytham, loanwords).
3. Import and the page: a Tamil Anki deck test-imported, the page through `LANGUAGE_PAGES`, and `ta` joins `SupportedTag` once a fluent Tamil reader has reviewed the rules and the prompt module.

## Instrumentation

The question: do heritage learners keep reviewing, and does recall hold once the reading leaves the cue? `review_graded` sends `reading`, `example_readings` and `readings_faded` with `reading_language=ta`, as the other engines do. A learner's own reading is a card edit the audit log already records, which shows how often the rule misreads; no new event.

## Open questions

1. Lymi's letters (pāḍal) or chat spelling (paadal), which heritage learners type? Lean: Lymi's, checked with two or three heritage learners before slice 3.
2. Should an example's reading fade over an inflected form of a Known word, such as வீட்டில் for வீடு? Lean: not until the review data shows readings that never fade.
3. Written cards with a spoken notes line, or spoken-Tamil decks for heritage learners who want conversation first?
4. Who is the fluent Tamil reviewer for the voicing rules and the prompt module?
5. Does CONTEXT.md keep romanization on Reading's avoid list once a Reading is in Latin letters? Lean: yes; copy says Reading.
