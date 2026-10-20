---
status: in_progress
date: 2026-10-20
decision: Configured languages join only with an evaluation, and its pass rate decides whether enrichment fills their cards unasked
---

# Long-tail languages

Learners of a language without a course rely on a tutor or a class and write their own cards, as an Estonian evening class does. That is Lymi's core job. They also have the least reason to trust the AI: the less text a model has seen in a language, the more confidently it writes something wrong. This proposal adds the long tail as configured languages ([supported languages](supported-languages.md), Tiers) and makes the AI earn its default in each one.

## The gate

A configured language joins with an invented fixture in `apps/web/src/server/enrichment/evaluation.json`: about ten terms with what a right answer holds, chosen around the language's traps, such as Filipino *basa* (bása, read; basâ, wet). Its cases join the recorded run.

**The bar.** A language's pass rate counts only the expectation checks, which ask whether the AI got the language right, not the house-style checks. At 90% or above, a new language deck lets the AI fill the fields its row starts with. Below it, a new deck is created with no AI fields, so nothing is filled until the owner turns fields on in deck settings; from then on adds and Enrich fill them as in any deck. The deck stores that at creation, so a later move of the bar never changes an existing deck, and a deck whose owner never chose keeps following its language's defaults, as ADR 0033 has it. AI text carries the AI badge either way.

**Enforcement.** Each row in `packages/core/src/languages/configured.ts` states `enrichByDefault`. `recorded-run.test.ts` fails when a row has no fixture or disagrees with the recorded runs, and names the value to set. A language turns on only when it meets the bar in the latest run and in the run before, so a new language needs two runs, and turns off after one run below it: one noisy run can close the gate but never open it. Runs of different prompts are compared only on the cases both answered, so a new fixture is not a regression; two runs of one prompt are not compared, since they differ only by noise.

**Where it stands.** Every configured language passes twice except Filipino, which misses its stress marks (baháy for báhay, basá for bása, read) and failed one of its two runs, so new Filipino decks wait for their owner.

## Voices

Gemini TTS already speaks all five, with OpenAI behind it for all but Georgian. A native ElevenLabs voice goes first only where it beats Gemini. The API key lacks `voices_read`, so candidates came from the public library's first page per sort, which has native voices for Tamil, Filipino and Vietnamese only. Each candidate said ten words through Lymi's providers; a word counts when two of gpt-4o-transcribe, whisper-1 and Gemini 3.1 Flash Lite heard it back.

| Language | Voice | Words heard right | Loudness (LUFS) |
| --- | --- | --- | --- |
| Filipino | **Gemini Kore** | 10/10 | −19.8 to −13.7 |
| | Kuya Pedro Penduko · Nanay Pilar · Pedro · Ate Lyn (ElevenLabs) | 10 · 10 · 9 · 8 | |
| Vietnamese | **Ninh Đôn** (ElevenLabs, northern) | 9/10 | −23.2 to −20.5 |
| | Trung Caha · Tung Dang · Nhu (ElevenLabs) | 9 · 9 · 7 | |
| | Gemini Kore | 8/10, one request refused | |
| Georgian | **Gemini Kore** · Puck · ElevenLabs v3 Aria | 2 · 1 · 1 | |
| Armenian | **Gemini Kore** · Puck | 3 · 5 | |
| Tamil | **Gemini Kore** | 9/10 | −18.1 to −11.7 |
| | Ramaa · Nila · Meera · Nila warm (ElevenLabs) | 8 · 7 · 7 · 6 | |

Vietnamese switches to Ninh Đôn: Gemini said nước so that two listeners heard nục and refused ngân hàng outright. Of the three native voices that tied, Ninh Đôn is verified on `eleven_v4` and has the most even level. The listeners barely know Georgian and Armenian, so those rows show only that Gemini speaks; Puck did better than Kore in Armenian, but Lymi has one Gemini voice for every language. A person should listen before these choices are final.

A language with no native voice speaks with Gemini's default voice; one Gemini does not list falls to OpenAI, then Chirp; one none of them lists has no audio, and the audio route answers that it is not configured.

## Languages and tiers

| Language | Tags | Pronunciation | Notes | Tier |
| --- | --- | --- | --- | --- |
| Filipino | `fil`, `tl` | the term with stress marks: báhay, bátà, basâ | verb focus and aspect | configured, below the bar |
| Vietnamese | `vi` | tone marks for a term typed without them (cam on → cảm ơn), an abbreviation said (km → ki-lô-mét), else empty | classifier, north and south words | configured |
| Georgian | `ka` | national romanization with ejectives marked: ჭიქა ch'ika | verbal noun, present, aorist | configured |
| Armenian | `hy` | Eastern Armenian romanized as said: քույր k'uyr | irregular plurals, present | configured |
| Tamil | `ta` | the written word read aloud, romanized: தம்பி tambi | verb forms, the spoken form | configured, until the word-by-word engine of [Tamil](tamil.md), whose letters it already uses |
| Estonian, Latvian, Lithuanian, Finnish, Norwegian, Danish, Dutch | | | principal forms, gender and plural | configured, next |
| Persian, Urdu | | | | platform: right-to-left first |
| Cantonese | `yue` | | | supported: jyutping engine |

Filipino marks stress in place rather than respelling it in capitals: Filipino dictionaries print the marks, they keep the glottal stop, and removing them gives the term back, as the marks-in-place engines need. Georgian, Armenian and Tamil name faces in `packages/design/tokens.css`, because Onest has none of their letters; iOS needs no name for them, since no other language shares their letters.

## Open questions

1. Should the gate work per field, so Filipino meanings, which pass, stay on while only its stress marks wait?
2. Is 90% over about forty expectations the right bar? Two cases move Filipino across it, which is why opening the gate takes two runs.
3. Who reviews each fixture? They are invented, and a wrong expectation fails a right answer: a fluent reader should check each before the gate is trusted.
4. Vietnamese has two tone placements, hòa and hoà, which NFC does not unify: should the duplicate key fold them?
5. Should a Western Armenian deck (`hyw`) get its own row, since its consonants voice the other way?
6. Should `GET /api/languages` publish whether a language enriches unasked, so a connected app can warn before it asks?
7. Should deck settings say why a gated language's AI fields start off, and should Enrich on one card fill the row's starting fields without the owner turning them on?
