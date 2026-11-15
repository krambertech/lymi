---
status: in_progress
date: 2026-10-20
decision: Configured languages join only with an evaluation, and its pass rate decides whether enrichment fills their cards unasked
---

# Long-tail languages

Learners whose language has little course material may rely on a tutor or class and write their own cards. AI enrichment can make errors in these languages. This proposal adds them as configured languages ([supported languages](supported-languages.md), Tiers), with evaluation results determining whether enrichment is on by default.

## Evaluation threshold

A configured language joins with an invented fixture in `apps/web/src/server/enrichment/evaluation.json`: about ten terms with what a right answer holds, chosen around the language's traps, such as Filipino *basa* (bása, read; basâ, wet). Its cases join the recorded run.

**Pass rate.** A language's pass rate counts only the expectation checks, which ask whether the AI got the language right, not the house-style checks. At 90% or above, a new language deck lets the AI fill the fields its row starts with. Below it, a new deck is created with no AI fields, so nothing is filled until the owner turns fields on in deck settings; from then on adds and Enrich fill them as in any deck.

The deck stores this choice when it is created, imported or moved into the language without an explicit field choice. Later threshold changes leave existing decks unchanged. A deck whose owner never chose follows its language's defaults, as ADR 0033 has it, but a row below the bar adds none of its starting fields, so such a deck keeps meaning and example as before the row existed. AI text carries the AI badge either way.

**Enforcement.** Each row in `packages/core/src/languages/configured.ts` states `enrichByDefault`. `recorded-run.test.ts` fails when a row has no fixture or disagrees with the recorded runs, and names the value to set. A language turns on only when it meets the bar in the latest run and in the run before, so a new language needs two runs, and turns off after one run below it: one noisy run can disable default enrichment but cannot enable it. Runs of different prompts are compared only on the cases both answered, so adding a fixture does not count as a regression; two runs of one prompt are not compared, since they differ only by noise.

**Where it stands.** Filipino sits at the bar, so runs of an unchanged prompt move it: it misses two or three stress marks a run (baháy for báhay), and its gate is open. Tamil has left the table for its own record, whose reading Lymi works out from the spelling ([Tamil](tamil.md)). Every other configured language passes.

## Voices

A native ElevenLabs voice goes first only where it beats Gemini TTS, which speaks every language here: each candidate from the public library said ten words, scored by whether two of three transcribers heard them back. Vietnamese uses Ninh Đôn (northern): Gemini said nước as nục and refused ngân hàng. Bokmål uses Mia Starset (Oslo), which said tjue and kirke cleanly where Gemini drifted, and Swedish uses Evelina (Stockholm), which every listener heard right. Danish keeps Søren, chosen by listening, although the transcribers heard Gemini better; Danish's soft d and stød defeat them, so a person decides. Filipino and Tamil keep Gemini, which matched or beat every native voice. Polish keeps it, tied with the best native voice; Georgian, Armenian, Nynorsk, Icelandic, Latvian and Lithuanian keep it because the library has no voice for them. OpenAI handles Gemini's refusals, which occurred on 3 of 10 Lithuanian words in the test. Estonian, Finnish and Dutch keep the voices already chosen by listening. A person should listen before these choices are final.

Without a native voice a language speaks with Gemini, then OpenAI, then Chirp; with none of them it has no audio.

## Languages and tiers

Each language's notes are in [Writing cards](../card-writing.md).

| Language | Tags | Pronunciation | Tier |
| --- | --- | --- | --- |
| Filipino | `fil`, `tl` | the term with stress marks: báhay, bátà, basâ | configured, at the bar |
| Vietnamese | `vi` | tone marks for a term typed without them (cam on → cảm ơn), an abbreviation said (km → ki-lô-mét), else empty | configured |
| Georgian | `ka` | national romanization with ejectives marked: ჭიქა ch'ika | configured |
| Armenian | `hy` | Eastern Armenian romanized as said: քույր k'uyr | configured |
| Tamil | `ta` | worked out from the spelling and drawn over each word; the field holds a reading only for a loanword: பஸ் bas | a record on the word-by-word engine of [Tamil](tamil.md) |
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
2. Is 90% over about forty expectations the right bar? Two cases move Filipino across it, so random variation can change whether default enrichment is enabled; pooling more runs, or a lower bar to close than to open, would steady them.
3. Who reviews each invented fixture? A wrong expectation fails a right answer.
4. Vietnamese has two tone placements, hòa and hoà, which NFC does not unify: should the duplicate key fold them?
5. Should Western Armenian (`hyw`) get its own row?
6. Should `GET /api/languages` say whether a language enriches unasked?
7. Should deck settings say why a gated language's AI fields start off?
