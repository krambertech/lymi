---
status: exploration
date: 2026-10-19
decision: none
---

# Russian and Ukrainian

A beginner learning Russian or Ukrainian should find that Lymi just works: each word arrives with its stress marked, the mark leaves the cue once the word is Known, audio stresses the right syllable, and за́мок (castle) and замо́к (lock) are two cards. They are the third and fourth [supported languages](supported-languages.md), on the marks-in-place engine, as two records delivered after Chinese; this file holds only what is particular to them. Kateryna reads both and is their fluent reviewer. Not decided: whether speech reads the mark, the form's label, and ё (see Open questions).

## Evidence

Stress in both languages is free, moves as a word inflects (го́род, города́), goes unmarked in native text, and is printed as an acute accent in learner materials.

Today's code:

- `normaliseTerm` in `packages/core/src/terms.ts` keeps U+0301, so за́мок and замок are two terms; `readingKey` is Japanese-only, so замок read за́мок and замок read замо́к are duplicates. `searchKey` keeps U+0301 too, so a search for замок misses a term stored as за́мок.
- The `ru` and `uk` guides in `apps/web/src/server/enrichment/languages.ts` ask for the term with an accent on each word of two or more syllables, not IPA, and in notes the aspect pair, a case other than the accusative, gender when the ending hides it, and an irregular plural (Russian adds the genitive plural). `evaluation.json` has three Russian cases and no Ukrainian ones.
- `spokenText` in `apps/web/src/server/services/audio.ts` speaks the term, never the pronunciation, and the clip cache is keyed by the spoken text, so за́мок and замо́к share one clip. Both languages go to a native ElevenLabs v4 voice first (`speech-voices.ts`: Denis, Alex Nekrasov), then Gemini-TTS, OpenAI and Chirp 3 HD. No provider documents whether it reads U+0301 as stress (searched 2026-10-19).
- The web's Onest Cyrillic subset already covers U+0301 and ґ (`apps/web/src/client/styles.css`).
- No Russian vocabulary deck is published. Ukrainian has its alphabet, A1, A2, core words and conversation decks, and Welcome offers the first four through `BEGINNER_DECKS` in `packages/client/src/welcome.ts`.

## Decision (leaning)

**Records.** `ru` and `uk` are separate records, each with its own prompt module, fixture, verify feature, review and slice, on one engine and one font token.

**Storage.** The term is stored as natives write it, unmarked. The pronunciation is the term with U+0301 on the stressed vowel of each word of two or more syllables, and it is valid only when removing the marks gives the term back. In Russian the dots of ё count as a mark, so the pronunciation may restore ё where the term writes е (ёжик for ежик); in Ukrainian they do not, because ї is і with dots. A word stressed on ё takes no acute, and a one-syllable word gets no pronunciation unless it restores ё.

**Drawing.** Through `TermText`, the marked form stands in for the term on the cue while the card is New or Learning, and the plain term returns once it is Known; the answer always shows the marked form. Examples carry marks inline and never fade, because a Known лицо says nothing about лица́ against ли́ца. Every phone already draws a combining mark, so older phones need no stripping.

**Writes.** In `normalizeCardText`, a stressed term with no different pronunciation splits into the plain term and the marked pronunciation, which is how Smart add and imports keep a lesson's stress, and an accented Latin look-alike inside a Cyrillic word (á, ó) becomes the Cyrillic letter and U+0301. A split is not a new term, so a recording stays.

**Duplicates.** For `ru` and `uk` only, `normalized_term` drops U+0301, and Ukrainian folds ’ ‘ ʼ and ` to ', so м’ясо and м'ясо are one term. The fold is never global: NFC keeps U+0301 on Lithuanian ą́. The reading key is the folded marked pronunciation, null unless it is valid and carries a mark, so за́мок and замо́к stay apart and an unmarked add matches either. ADR 0004 gains a paragraph saying so. The phone and the server change the fold together, behind the architecture's raised minimum version.

**Backfill.** A one-off Worker job rather than a migration, because it changes learner content and every write goes through `services/audit.ts`. As the system actor it splits every `ru` and `uk` card whose term carries a mark and whose pronunciation is empty, then rekeys. A card with another pronunciation, such as IPA, keeps its stressed term and key until the learner edits it, so it never merges with its homograph. Two cards that become duplicates, such as за́мок beside замок, both stay, because the rule applies only to adds; the job counts them in its log and archives nothing.

**Search.** `searchKey` drops U+0301 and folds the same apostrophes to ' on both sides in every language, since it takes no language and search may be looser than a duplicate.

**Speech.** If the voices read U+0301 as stress, `spokenText` speaks the marked pronunciation, which also gives each homograph its own clip; otherwise it speaks the plain term, as now. Kateryna runs a listening test, since it calls paid voices: a script sends about 20 marked pairs per language through each provider in the chain and writes unlabelled clips with a sheet for the syllable she hears. Russian starts with за́мок/замо́к, му́ка/мука́, пла́чу/плачу́, сто́ит/стои́т, ду́хи/духи́ and по́лки/полки́; Ukrainian with за́мок/замо́к, бра́ти/брати́, доро́га/дорога́, ви́кликати/викли́кати and ру́ки/руки́, plus words such as дитина and їжак for и, і, е and є. A provider passes when it stresses 95% of marked words right and never voices the mark; one that fails gets the plain term. A Ukrainian clip with Russian vowels fails even with the right stress. The script is `pnpm --filter @lymi/web eval:stress` (`apps/web/src/server/speech-stress`); it also tries each voice's own markup, IPA for ElevenLabs and Chirp and a prompt line for Gemini and OpenAI, and prints the results table for here.

**Prompts.** The enrich slots keep today's rules and add marks in the example as in the pronunciation, none on ё or one-syllable words, and in notes a stress that moves (го́род · города́; жить · жила́). The AI adds marks to a learner's example only when removing them gives the text back. The hook slot gets the marked form, so a sound-alike covers the stressed syllable. `checks` fails a word of two or more syllables without a mark, two marks in one word, and a mark on ё. Fixtures lead with the speech pairs, plus Ukrainian words whose Russian look-alikes mean something else: неділя (Sunday), час (time), луна (echo), питати (to ask).

**Import.** The Anki and Quizlet adapters both run the split, and before stripping HTML the Anki adapter turns one bold or underlined vowel per word into U+0301, as many decks mark stress. One Anki deck and one Quizlet set per language are test-imported first.

**Beginner decks.** Each language gets its own alphabet deck, since the alphabets differ (ё ы э ъ against і ї є ґ) and so do и and е, then an A1 deck and an essentials deck, written and reviewed by Kateryna and offered at Welcome through `BEGINNER_DECKS`.

**Page.** The showpiece is за́мок against замо́к: two cards, the mark on each cue, the plain term once Known.

**Left out.** IPA, transliteration, secondary stress, stress drills, conjugation tables, and Belarusian, which could reuse the engine later.

## Delivery

Each slice builds on supported-languages slices 1–4.

1. The Russian record: validity, ё, the split, the stress fold with the ADR 0004 amendment, the reading key and the backfill job, with its conformance fixture; search without the mark; the listening test and the `spokenText` change it decides.
2. The marked form on the cue on the web and the phone, and the card form's label.
3. The `ru` prompt module, reviewed by Kateryna, with a recorded run.
4. Import: the test-imports, then the Anki stress conversion.
5. Russian decks, the page, the `russian.md` verify feature, and `ru` joining `SupportedTag`.
6. Ukrainian, the same way: its record with the apostrophe fold, its prompt module, listening test, decks, page and `ukrainian.md`, then `uk` joining `SupportedTag`.

## Instrumentation

The question: do Russian and Ukrainian learners keep reviewing, and does recall hold once the stress leaves the cue? `review_graded` sends `reading` whenever the marked form is drawn, with `reading_language=ru` or `uk`, and never `example_readings` or `readings_faded`, since nothing fades. `import_finished` counts split terms and converted vowels in the `readings_converted` count Chinese adds. The backfill logs its counts and sends no event, because no learner acted.

## Open questions

1. The form's label: **Stress** (Ударение, Наголос) with its own CONTEXT.md entry, or **Reading**, which CONTEXT.md defines by a script that does not show its sound? Lean: Stress, since Cyrillic shows every sound but one.
2. Should Russian duplicates fold ё into е? Lean: no, since the fold would merge все and всё whenever either card lacks a pronunciation, as every card does until enrichment runs; the cost is that еж and ёж can be two cards.
3. Should the AI mark stress in examples on every deck, or leave advanced decks unmarked? Lean: every deck, since stress moves as words inflect.
4. Which Anki deck and Quizlet set should each language test-import?
