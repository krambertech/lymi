---
status: in_progress
date: 2026-10-17
decision: the card's language drives Japanese behaviour; readings live in existing fields and furigana fades as the learner's cards become Known
---

# Japanese

A beginner learning Japanese should find that Lymi just works: kanji arrive with readings, readings fade as words are learned, audio says the word right, and a deck from Anki arrives whole. There is no Japanese mode and no setting. Not decided: the order of slices 4 to 6.

## Evidence

Kanji carry meaning and are read differently from word to word (日 in 日本, 毎日, 今日), so textbooks print furigana, small hiragana over the kanji, until the reader knows them. Before this work, the web review showed the reading before the reveal, audio spoke the kanji, the duplicate key ignored the reading, and readings were a line of text. A test import of Kaishi 1.5k skipped all 2,999 native recordings, dropped pitch accent and furigana in examples, and merged the sentence translation and a frequency number into the notes.

## Decision

- **Fields.** No new ones. The term is written as natives write it, in dictionary form. Its reading stays in the pronunciation field in hiragana, and furigana is derived by aligning the two. Examples carry readings inline in Anki's notation, `食[た]べます`; plain-text uses strip the brackets. CONTEXT.md names this a **Reading**.
- **Furigana.** Over the term on the cue while the card is New or Learning, gone once it is Known; always over the term in the answer. Over an example's kanji except where the kanji and reading match one of the learner's Known cards.
- **The AI.** It writes example readings, and adds them to a learner's example only when the text without brackets is unchanged.
- **Audio.** Spoken from the reading. A recorded clip from an import is the card's audio and is never replaced; generated speech fills only cards without one. Sentence audio waits.
- **Import.** Pitch accent and the sentence translation each become one notes line; a frequency number is dropped.
- **Left out.** Romaji as a reading aid, extra review modes, kanji cards as a type, handwriting and typed answers.

## Delivery

1. Correctness: the reading after the reveal, audio from the reading, duplicates, the AI's checks, a Japanese font, Smart add readings.
2. Furigana on the web, with the shared code in `packages/core`.
3. Import fidelity: recorded audio, pitch accent, notes.
4. Furigana on the phone.
5. Example furigana that fades over known words, on the web and the phone. The Known pairs come from every deck's card list the clients already keep for offline use, with the device's own grades laid over them, so it costs no request and a Forgot brings a reading back at once; a reading that fades keeps its room. The card form's preview shows every reading, because it is where the learner checks what they typed.
6. A beginner's start, built on the published Read Japanese Kana deck rather than new Hiragana and Katakana decks: Welcome offers a Japanese learner Read Japanese Kana, then JLPT N5, JLPT N4 and Japanese Essentials. The page at `lymi.app/languages/japanese` waits for a design.
