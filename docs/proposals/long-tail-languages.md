---
status: in_progress
date: 2026-10-20
decision: Configured languages join only with an evaluation, and its pass rate decides whether enrichment fills their cards unasked
---

# Long-tail languages

Learners of a language without a course rely on a tutor or a class and write their own cards, which is Lymi's core job, and they have the least reason to trust the AI: the less text a model has seen in a language, the more confidently it writes something wrong. This proposal adds the long tail as configured languages ([supported languages](supported-languages.md), Tiers) and makes the AI earn its default in each one.

## The gate

A configured language joins with an invented fixture in `apps/web/src/server/enrichment/evaluation.json`: about ten terms with what a right answer holds, chosen around the language's traps, such as Filipino *basa* (bása, read; basâ, wet). Its cases join the recorded run.

**The bar.** A language's pass rate counts only the expectation checks, which ask whether the AI got the language right, not the house-style checks. At 90% or above, a new language deck lets the AI fill the fields its row starts with. Below it, a new deck is created with no AI fields, so nothing is filled until the owner turns fields on in deck settings; from then on adds and Enrich fill them as in any deck. A deck stores that when it is created, imported or moved into the language without a choice of its own, so a later move of the bar never changes an existing deck. A deck whose owner never chose follows its language's defaults, as ADR 0033 has it, but a row below the bar adds none of its starting fields, so such a deck keeps meaning and example as before the row existed. AI text carries the AI badge either way.

**Enforcement.** Each row in `packages/core/src/languages/configured.ts` states `enrichByDefault`. `recorded-run.test.ts` fails when a row has no fixture or disagrees with the recorded runs, and names the value to set. A language turns on only when it meets the bar in the latest run and in the run before, so a new language needs two runs, and turns off after one run below it: one noisy run can close the gate but never open it. Runs of different prompts are compared only on the cases both answered, so a new fixture is not a regression; two runs of one prompt are not compared, since they differ only by noise.

**Where it stands.** Filipino and Tamil sit at the bar, so runs of an unchanged prompt move them: Filipino misses two or three stress marks a run (baháy for báhay) and its gate is open; Tamil lost five romanizations in one run, then passed two in a row, so its gate is open too. Every other configured language passes.

## Voices

A native ElevenLabs voice goes first only where it beats Gemini TTS, which speaks every language here: each candidate from the public library said ten words, scored by whether two of three transcribers heard them back. Vietnamese uses Ninh Đôn (northern): Gemini said nước as nục and refused ngân hàng. Bokmål uses Mia Starset (Oslo), which said tjue and kirke cleanly where Gemini drifted, and Swedish uses Evelina (Stockholm), which every listener heard right. Danish keeps Søren, chosen by listening, although the transcribers heard Gemini better; Danish's soft d and stød defeat them, so a person decides. Filipino and Tamil keep Gemini, which matched or beat every native voice. Polish keeps it, tied with the best native voice; Georgian, Armenian, Nynorsk, Icelandic, Latvian and Lithuanian keep it because the library has no voice for them, and Gemini's refusals, 3 of 10 Lithuanian words, fall to OpenAI. Estonian, Finnish and Dutch keep the voices already chosen by listening. A person should listen before these choices are final.

Without a native voice a language speaks with Gemini, then OpenAI, then Chirp; with none of them it has no audio.

## Languages and tiers

Each language's notes are in [Writing cards](../card-writing.md).

| Language | Tags | Pronunciation | Tier |
| --- | --- | --- | --- |
| Filipino | `fil`, `tl` | the term with stress marks: báhay, bátà, basâ | configured, at the bar |
| Vietnamese | `vi` | tone marks for a term typed without them (cam on → cảm ơn), an abbreviation said (km → ki-lô-mét), else empty | configured |
| Georgian | `ka` | national romanization with ejectives marked: ჭიქა ch'ika | configured |
| Armenian | `hy` | Eastern Armenian romanized as said: քույր k'uyr | configured |
| Tamil | `ta` | the written word read aloud, romanized: தம்பி tambi | configured, until the word-by-word engine of [Tamil](tamil.md), whose letters it already uses |
| Lithuanian | `lt` | the term with its accent mark: nãmas, výras, kalbà; starts off, since live runs wrote vỹras for výras | configured |
| Danish | `da` | IPA as Den Danske Ordbog writes it, with stød: hus ˈhuˀs | configured |
| Estonian, Finnish, Latvian, Icelandic | `et`, `fi`, `lv`, `is` | empty: read as written | configured, no format |
| Swedish, Norwegian, Dutch | `sv`, `nb` (`no` means Bokmål), `nn`, `nl` | empty | configured, no format |
| Polish | `pl` | empty: stress is penultimate | configured, no format |
| French, Portuguese | `fr`, `pt` (Portugal), `pt-BR` | IPA; French marks liaison, each Portuguese row its variety | configured |
| German, Spanish, Italian, Hungarian, Czech | `de`, `es`, `it`, `hu`, `cs` | empty | configured, no format |
| Persian, Urdu | | | platform: right-to-left first |
| Cantonese | `yue` | | supported: jyutping engine |

Filipino marks stress in place rather than respelling it in capitals: Filipino dictionaries print the marks, they keep the glottal stop, and removing them gives the term back, as the marks-in-place engines need. A configured row may have no format of its own, as Estonian has none: it still carries the gate and its starting fields. Lithuanian accent marks survive every write, since only Russian and Ukrainian fold U+0301. Georgian, Armenian and Tamil name faces in `packages/design/tokens.css`, because Onest has none of their letters; iOS needs no name for them, since no other language shares their letters.

## Open questions

1. Should the gate work per field, so Filipino meanings, which pass, stay on while only its stress marks wait?
2. Is 90% over about forty expectations the right bar? Two cases move Filipino and Tamil across it, so their gates follow noise; pooling more runs, or a lower bar to close than to open, would steady them.
3. Who reviews each invented fixture? A wrong expectation fails a right answer.
4. Vietnamese has two tone placements, hòa and hoà, which NFC does not unify: should the duplicate key fold them?
5. Should Western Armenian (`hyw`) get its own row?
6. Should `GET /api/languages` say whether a language enriches unasked?
7. Should deck settings say why a gated language's AI fields start off?
