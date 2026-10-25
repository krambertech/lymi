---
status: exploration
date: 2026-10-25
decision: none
---

# Polish

A Ukrainian living in Poland should find in Lymi the Polish they need first: the letters, everyday words, the office, and the words that look Ukrainian but mean something else. Polish becomes the fifth [supported language](supported-languages.md), with its own page in English, Ukrainian and Russian. The Ukrainian edition is the one that matters most.

## Evidence

About 1.68 million Ukrainians live in Poland (Statistics Poland, 2026), and 73% of those surveyed by the University of Warsaw's Centre of Migration Research see their future there. Since 1 July 2025 citizenship needs a state B1 certificate or a degree taught in Polish, and the transition for older certificates ended on 30 June 2026. A draft would raise it to B2; it has not passed.

Research on Ukrainians learning Polish agrees on three things. The languages are close, so beginners understand fast and then stall, sure they are understood when they are not (Banach 2024, after Skalska and Skalski's "communication trap"). Understanding runs well ahead of speaking and writing (Izdebska-Długosz). Errors come from Ukrainian habits: false friends first, then a verb's case or preposition (*tęsknić za*, not *по*), then endings.

Banach's list of false friends from a year of refugee classes in Łódź: *sklep* (shop; склеп is a crypt), *dynia* (pumpkin; диня is a melon), *arbuz* (watermelon; гарбуз is a pumpkin), *dywan* (rug; диван is a sofa), *krzesło* (chair; крісло is an armchair), *owoce* (fruit; овочі are vegetables), *magazyn* (warehouse; магазин is a shop), *łyżwy* (skates; лижі are skis), *czaszka* (skull; чашка is a cup), *człowiek* (person; чоловік is a man or husband), *drużyna* (team; дружина is a wife), *pensja* (salary; пенсія is a pension), *plecy* (back; плечі are shoulders), *recepta* (prescription; рецепт is a recipe), *zwyczajnie* (ordinarily; звичайно is of course).

For every learner, Polish is hard in known places: seven cases, masculine-personal plurals (*studenci* but *studentki*), numbers that change the noun's case (*dwa koty*, *pięć kotów*), aspect pairs (*robić*, *zrobić*; *brać*, *wziąć*), verbs of motion, and stems that change (*pies*, *psa*; *ręka*, *ręce*). Spelling has letters that sound the same (*ó* and *u*, *rz* and *ż*, *ch* and *h*) and nasal vowels that change with what follows (*ząb* is said *zomp*, final *ę* is nearly *e*). Stress falls on the second-to-last syllable, with a few kinds of exception: *muzyka*, *matematyka*, *byliśmy*, *zrobiłabym*.

Today's code:

- `pl` is a configured language in `packages/core/src/languages/configured.ts`, with Latin script, no format and notes as its starting field.
- The `pl` guide in `apps/web/src/server/enrichment/languages.ts` already asks for aspect pairs, the genitive where the stem changes, masculine-personal plurals, the case a verb takes, *na* against *w*, a false friend for a reader in Ukrainian or Russian, and a grave accent on the stressed vowel of a word that breaks the stress rule (*mùzyka*). `evaluation.json` has one Polish case.
- `speech-voices.ts` reads Polish with a native ElevenLabs voice. Nobody has listened to it on *ę*, *ą*, *rz* or *szcz*.
- Eight Polish decks are published with Ukrainian and Russian editions: `polish-a1-vocabulary` (249 cards), `polish-a2-vocabulary`, `polish-b1-vocabulary`, `core-polish-words` (64), `everyday-polish-conversation`, `travel-polish`, `polish-for-offices-and-paperwork` (50) and `polish-road-signs`. There is no alphabet deck.
- Search does not fold Latin diacritics, so *zolw* misses *żółw*. NFD leaves *ł* whole, so stripping marks alone would not fix it.
- Estonian, also configured, has its own page through a separate route (`ESTONIAN_PAGE_DECKS`); `LANGUAGE_PAGES` and `BEGINNER_DECKS` take only a `SupportedTag`.

## Decision (leaning)

**Tier.** Polish joins `SupportedTag` on the marks-in-place engine. Only a word that breaks the stress rule has a pronunciation: the term with a grave over its stressed vowel, which is what the enrichment guide already writes. The cue draws that word's stressed syllable underlined until the card is Known, because a drawn *ù* looks like a letter Polish lacks; a regular word has no pronunciation and draws as it is. The exceptions are a small group: words in -yka and -ika, first- and second-person plural past forms (*byliśmy*), the conditional (*zrobiłabym*), and a few numerals (*czterysta*). `StressRules` gains the mark it uses, so Polish never treats the acute in *ó* as stress. Duplicates follow the reading key, as Ukrainian's do, though Polish has almost no words told apart by stress. Examples carry no marks. This is the smallest honest way in: the page table, Welcome's beginner path, analytics and verify all key on `SupportedTag`.

**Beginner path.** A new `polish-alphabet` deck, then `polish-a1-vocabulary`, `polish-a2-vocabulary` and `core-polish-words`, through `BEGINNER_DECKS.pl`. The Ukrainian edition of the alphabet maps each Polish letter to the Ukrainian one (*sz* ш, *cz* ч, *szcz* щ, *ż* and *rz* ж, *y* и, *i* і, *w* в, *ł* like the last в in вовк, *ch* and *h* х, *ó* у), and says where there is none (*ą*, *ę*).

**More decks.** `polish-top-100-verbs` and `polish-top-1000-words`, as Estonian has, with Ukrainian and Russian editions.

**False friends.** A false friend depends on the reader's language, so each is its own deck in one meaning language with no editions: Ukrainian first, built from Banach's list and checked by Kateryna, then Russian and English (*aktualny*, *ewentualnie*, *ordynarny*). A deck written only in Ukrainian appears only on Ukrainian Explore. Inside the other decks, the warning lives in the edition's notes, so the Ukrainian edition's *sklep* says it is not склеп and the English one says nothing. A tag cannot do this, because tags belong to the deck and every edition shares them.

**Speaking.** Recognition is nearly free for a Ukrainian reader and production is the gap, so the beginner decks are published with both directions.

**Prompts.** The `pl` module gains a slot for readers in Ukrainian or Russian: note a verb whose case or preposition differs from Ukrainian (*tęsknić za*, not *по*), and a false friend. Twenty invented fixtures per slot, led by the false friends and stress exceptions, with a recorded run. Kateryna reviews.

**Speech.** As with Ukrainian, the `pl` record sends «Po polsku:» as `speech.context` before every term, so the voice hears the language and not a neighbour's. Then a short listening test on final *ę*, *ą* before a consonant, *rz*, *szcz* and the stress exceptions. A voice that fails is replaced.

**Page.** `/languages/polish` in three locales through `LANGUAGE_PAGES`. The showpiece differs by locale: in Ukrainian and Russian, the false friends (*sklep* against склеп, *dynia* and *arbuz* against диня and гарбуз); in English, a word's forms (*pies*, *psa*; *robić*, *zrobić*). Below it, the deck path from the alphabet, the office deck for people settling in Poland, the voice, enrichment, and the B1 certificate.

**Instrumentation.** `review_graded` sends `reading_language=pl` when a stress mark is drawn. The question is whether Polish learners who start from Welcome keep reviewing after the first week, against the other supported languages.

**Left out.** Declension and conjugation tables, case drills and typed answers. Lymi is a card app, and the forms belong in a card's notes.

## Delivery

1. The `pl` record on the stress engine with a grave mark, its conformance fixture and the cue drawing on the web and the phone.
2. The `pl` prompt module with its fixtures and recorded run, and the listening test.
3. The alphabet, top 100 verbs and top 1000 words, with Ukrainian and Russian editions; the Ukrainian false-friends deck; and false-friend notes in the existing decks' Ukrainian and Russian editions.
4. The page, the `polish.md` verify feature, `BEGINNER_DECKS.pl`, and `pl` joining `SupportedTag`.

Separate, because it touches every language: search that finds *żółw* from *zolw*. Separate, because it is its own page: `/exams/polish-b1-certificate`, built on `polish-b1-vocabulary` and the office deck.

## Open questions

1. Does an exception word show its stress as an accent, an underlined syllable, or a lit syllable?
2. Does the English edition need its own showpiece, or is the page mainly for Ukrainian and Russian readers?
3. Do the Russian and English false-friends decks come with this work, or after the page?
