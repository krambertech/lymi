---
status: exploration
date: 2026-10-25
decision: none
---

# Polish

A Ukrainian living in Poland should find in Lymi the Polish they need first: the letters, everyday words, the office, and the words that look Ukrainian but mean something else. Polish stays a configured language, and gets its own page in English, Ukrainian and Russian and a beginner path in Welcome. The Ukrainian edition is the one that matters most.

## Evidence

About 1.68 million Ukrainians live in Poland (Statistics Poland, 2026), and 73% of those surveyed by the University of Warsaw's Centre of Migration Research see their future there. Since 1 July 2025 citizenship needs a state B1 certificate or a degree taught in Polish, and the transition for older certificates ended on 30 June 2026. A draft would raise it to B2; it has not passed.

Research on Ukrainians learning Polish agrees on three things. The languages are close, so beginners understand fast and then stall, sure they are understood when they are not (Banach 2024, after Skalska and Skalski's "communication trap"). Understanding runs well ahead of speaking and writing (Izdebska-Długosz). Errors come from Ukrainian habits: false friends first, then a verb's case or preposition (*dzwonić do mamy*, not мамі), then endings.

Banach's list of false friends from a year of refugee classes in Łódź: *sklep* (shop; склеп is a crypt), *dynia* (pumpkin; диня is a melon), *arbuz* (watermelon; гарбуз is a pumpkin), *dywan* (rug; диван is a sofa), *krzesło* (chair; крісло is an armchair), *owoce* (fruit; овочі are vegetables), *magazyn* (warehouse; магазин is a shop), *łyżwy* (skates; лижі are skis), *czaszka* (skull; чашка is a cup), *człowiek* (person; чоловік is a man or husband), *drużyna* (team; дружина is a wife), *pensja* (salary; пенсія is a pension), *plecy* (back; плечі are shoulders), *recepta* (prescription; рецепт is a recipe), *zwyczajnie* (ordinarily; звичайно is of course).

For every learner, Polish is hard in known places: seven cases, masculine-personal plurals (*studenci* but *studentki*), numbers that change the noun's case (*dwa koty*, *pięć kotów*), aspect pairs (*robić*, *zrobić*; *brać*, *wziąć*), verbs of motion, and stems that change (*pies*, *psa*; *ręka*, *ręce*). Spelling has letters that sound the same (*ó* and *u*, *rz* and *ż*, *ch* and *h*) and nasal vowels that change with what follows (*ząb* is said *zomp*, final *ę* is nearly *e*). Stress falls on the second-to-last syllable, with a few kinds of exception: *muzyka*, *matematyka*, *byliśmy*, *zrobiłabym*.

Today's code:

- `pl` is a configured language in `packages/core/src/languages/configured.ts`, with Latin script, no format and notes as its starting field.
- The `pl` guide in `apps/web/src/server/enrichment/languages.ts` already asks for aspect pairs, the genitive where the stem changes, masculine-personal plurals, the case a verb takes, *na* against *w*, a false friend for a reader in Ukrainian or Russian, and a grave accent on the stressed vowel of a word that breaks the stress rule (*mùzyka*). `evaluation.json` has one Polish case.
- `speech-voices.ts` names a native ElevenLabs voice for Polish, but `pl` is not in `DEFAULT_NATIVE_SPEECH_LANGUAGES`, so Polish is voiced by Gemini first unless `ELEVENLABS_SPEECH_VOICES` names it. Nobody has listened to either on *ę*, *ą*, *rz* or *szcz*.
- Eight Polish decks are published with Ukrainian and Russian editions: `polish-a1-vocabulary` (249 cards), `polish-a2-vocabulary`, `polish-b1-vocabulary`, `core-polish-words` (64), `everyday-polish-conversation`, `travel-polish`, `polish-for-offices-and-paperwork` (50) and `polish-road-signs`. There is no alphabet deck.
- Search does not fold Latin diacritics, so *zolw* misses *żółw*. NFD leaves *ł* whole, so stripping marks alone would not fix it.
- Estonian, also configured, has its own page through a separate route (`ESTONIAN_PAGE_DECKS`); `LANGUAGE_PAGES` and `BEGINNER_DECKS` take only a `SupportedTag`.

## Decision (leaning)

**Tier.** Polish stays configured. It has no engine to add: its spelling shows its sound, and stress falls on the second-to-last syllable. A word that breaks the rule (words in -yka and -ika, *byliśmy*, *czterysta*) keeps the term with a grave over its stressed vowel in the pronunciation field, *mùzyka*, shown after the reveal as today. Drawing that stress on the cue was built and dropped: it was a Polish-only feature added mainly to put Polish on the supported list, and the field already carries it.

**Pages and Welcome for configured languages.** `LANGUAGE_PAGES` and `BEGINNER_DECKS` take a configured language as well as a `SupportedTag`, so Polish, and Estonian from its separate route, use the shared page and the beginner path.

**Beginner path.** A new `polish-alphabet` deck, then `polish-a1-vocabulary`, `polish-a2-vocabulary` and `core-polish-words`, through `BEGINNER_DECKS.pl`. The Ukrainian edition of the alphabet maps each Polish letter to the Ukrainian one (*sz* ш, *cz* ч, *szcz* щ, *ż* and *rz* ж, *y* и, *i* і, *w* в, *ł* like the last в in вовк, *ch* and *h* х, *ó* у), and says where there is none (*ą*, *ę*).

**More decks.** `polish-top-100-verbs` and `polish-top-1000-words`, as Estonian has, with Ukrainian and Russian editions.

**False friends.** A false friend depends on the reader's language, so each is its own deck in one meaning language with no editions: Ukrainian first, built from Banach's list and checked by Kateryna, then Russian and English (*aktualny*, *ewentualnie*, *ordynarny*). A deck written only in Ukrainian appears only on Ukrainian Explore. Inside the other decks, the warning lives in the edition's notes, so the Ukrainian edition's *sklep* says it is not склеп and the English one says nothing. A tag cannot do this, because tags belong to the deck and every edition shares them.

**Speaking.** Recognition is nearly free for a Ukrainian reader and production is the gap, so the beginner decks are published with both directions.

**Prompts.** The `pl` guide in `enrichment/languages.ts` asks, for a reader in Ukrainian or Russian, for a false friend with its look-alike and a case or preposition that differs (for Ukrainian *dzwonić do mamy*, not мамі; for Russian *tęsknić za*, not по), and names the words that trick each reader. `evaluation.json` holds a `pl-en` deck led by the stress exceptions and regular words, and a `pl-uk` deck led by the false friends, with a recorded run. Kateryna reviews.

**Speech.** As with Ukrainian, the configured `pl` row names «Po polsku:» as its `speechContext`, so the voice hears the language and not a neighbour's. Only ElevenLabs takes previous text, so the context reaches Polish speech once `pl` is voiced there. A listening test on final *ę*, *ą* before a consonant, *rz*, *szcz* and the stress exceptions, Gemini against the ElevenLabs voice, decides whether `pl` joins `DEFAULT_NATIVE_SPEECH_LANGUAGES`; that switch voices every Polish card again on ElevenLabs, so it waits for the test.

**Page.** `/languages/polish` in three locales through `LANGUAGE_PAGES`. The showpiece differs by locale: in Ukrainian and Russian, the false friends (*sklep* against склеп, *dynia* and *arbuz* against диня and гарбуз); in English, a word's forms (*pies*, *psa*; *robić*, *zrobić*). Below it, the deck path from the alphabet, the office deck for people settling in Poland, the voice, enrichment, and the B1 certificate.

**Instrumentation.** The question is whether Polish learners who start from Welcome keep reviewing after the first week, against the other languages with a beginner path; Welcome's existing events, by language, answer it.

**Left out.** Declension and conjugation tables, case drills and typed answers. Lymi is a card app, and the forms belong in a card's notes.

## Delivery

1. «Po polsku:» as Polish's speech context, used once Polish is voiced on ElevenLabs, and the `pl` guide's false friends and case notes, with the `pl-en` and `pl-uk` evaluation decks and a recorded run.
2. The listening test.
3. The alphabet, top 100 verbs and top 1000 words, with Ukrainian and Russian editions; the Ukrainian false-friends deck; and false-friend notes in the existing decks' Ukrainian and Russian editions.
4. `LANGUAGE_PAGES` and `BEGINNER_DECKS` for configured languages, then the Polish page, `BEGINNER_DECKS.pl` and a `polish.md` verify feature.

Separate, because it touches every language: search that finds *żółw* from *zolw*. Separate, because it is its own page: `/exams/polish-b1-certificate`, built on `polish-b1-vocabulary` and the office deck.

## Open questions

1. Does Estonian move onto the shared page when the page table opens to configured languages?
2. Does the English edition need its own showpiece, or is the page mainly for Ukrainian and Russian readers?
3. Do the Russian and English false-friends decks come with this work, or after the page?
