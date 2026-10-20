# Writing cards

How a Lymi card is written, for anyone who writes one: a learner, a publisher of a public deck, and the AI when it reads a lesson. The AI's lesson prompt in `apps/web/src/server/lessons/prompt.ts` encodes these rules, so a change here is a change there.

A good card asks one thing and has one normal answer. Everything else on it is optional reading after the answer.

## The rules

1. **One term, one sense.** A card with two words or two senses fails on either part and stays hard. A word with two senses the learner needs gets two cards, each with its own meaning.
2. **The meaning is one short translation in the learner's language, one to three words.** A list of synonyms is harder to recall than any one of them. Write the sense the lesson teaches, not every sense the dictionary has.
3. **Production has one right answer.** When a meaning fits more than one term, add a short cue in parentheses so only this term fits: "думать (размышлять)" for mõtlema, "думать (считать)" for arvama. A card with two right answers marks the learner wrong for knowing the other one.
4. **The term is the citation form, in the deck's fixed shape.** Estonian verbs carry their three principal forms ("jooma · juua · joon"), a German noun carries its article. The shape is the same for every card of that kind in the deck, and the forms are copied as the lesson prints them.
5. **The example is one short sentence in the language being learned, untranslated, where every other word is easier than the term.** It shows the word in use; it is not what the learner recalls.
6. **Nothing on the cue side gives the answer away.** An example, note or hook that spells the term turns production into reading.
7. **Look-alikes get a contrast line on both cards.** Similar words and near-synonyms learned together are the most common cause of forgetting. One line ("сравни: arvama — считать") is cheaper than splitting the lesson.
8. **A hook is for a word that keeps failing, not for every card.** Mnemonics help when chosen, so the learner writes one, often when review offers it for an often-forgotten card. A hook leads back to the term without spelling it.
9. **A card that keeps failing is split or rewritten, not given more notes.**
10. **One format per deck.** The same term shape, the same meaning style and the same note labels on every card, so the deck reads as one voice and the AI can copy it.

## Japanese cards

A Japanese card is shaped by its language, with no setting of its own:

- **Term**: the dictionary form, written as natives write it: 食べる, 学校, and kana alone for a word normally written in kana, such as ありがとう or たくさん.
- **Reading**: the term's reading in hiragana, たべる, stored as the pronunciation and drawn over the kanji as furigana. Empty for a term written only in kana. No romaji.
- A term sent with its reading inline, `食[た]べる`, is stored as the term 食べる with the Reading たべる when every kanji has a kana reading and no other pronunciation was sent; anything else is stored as written.
- **Notes**: the word type and the polite form on one line, "ichidan verb · 食べます", "i-adjective · 高いです", and a transitive or intransitive pair when there is one.
- **Example**: one short sentence with a reading in square brackets after each run of kanji, and none over kana: `毎朝[まいあさ]パンを食[た]べます。`. A reading over a longer stretch, Anki's `食べます[たべます]`, is read the same way.

The AI may add readings to an example someone else wrote only when the text is otherwise unchanged; it never rewrites it.

## Korean cards

- **Pronunciation**: the term as it is said, in Hangul, only where that differs from the spelling: 학교 is said 학꾜, 국물 궁물. Empty for a word said as written, such as 사랑. No romanization, which a learner outgrows once they read Hangul.
- **Notes**: a verb or adjective's polite present form, 가다 → 가요. A Sino-Korean word gives each root's hanja and reading with one or two words that share it, 學 학: 학생, 학년, so one root opens a family of words. A native Korean word has no roots line.

## Other configured languages

- **Filipino** (`fil`, `tl`): the pronunciation is the term with its stress marks, an acute on the stressed vowel (báhay), a grave on a final vowel cut by a glottal stop (bátà) and a circumflex where both meet (basâ). Notes give a verb's root, its focus and its three aspects: *kumain · kumakain · kakain*.
- **Vietnamese** (`vi`): every word keeps its tone marks. The pronunciation is empty unless the term does not show how it is said: typed without tone marks (cam on → cảm ơn) or abbreviated (km → ki-lô-mét). Notes give a noun's classifier, *con chó*.
- **Georgian** (`ka`) and **Armenian** (`hy`): the pronunciation is a romanization, Georgian's national system with each ejective marked (ჭიქა ch'ika), and Eastern Armenian as it is said (քույր k'uyr).
- **Tamil** (`ta`): the pronunciation romanizes the written word as it is read aloud, with macrons and dots (தம்பி tambi). Notes give the spoken form where it differs, *தண்ணீர்*, said *taṇṇi*.

- **Lithuanian** (`lt`): the pronunciation is the term with its accent mark as dictionaries print it, an acute, grave or tilde on the stressed syllable (nãmas, výras, kalbà); the marks are never stripped. Notes give a noun's nominative and genitive and a verb's three forms: *eiti · eina · ėjo*.
- **Estonian, Finnish and Latvian** are read as written, so the pronunciation stays empty; notes give the principal forms, Finnish's with the plural partitive so consonant gradation shows, *katu · kadun · katua · katuja*, and for Latvian the genitive and any gender the ending hides: *suns, suņa*.
- **Swedish**, **Norwegian** (`nb`, `nn`; a plain `no` means Bokmål), **Danish** and **Dutch**: notes give a noun's gender or article with its definite and plural forms, *en bil, bilen, biler*, and a strong verb's forms; Nynorsk cards use Nynorsk forms, *ein bil, bilen, bilar*. A word told apart only by pitch accent says which, *anden*, accent 2: the spirit.
- **Danish** pronunciation is IPA as Den Danske Ordbog writes it, with stød and without the letters that are not said: hus ˈhuˀs.
- **Icelandic** notes give gender and nominative · genitive singular · nominative plural, *hestur, hests, hestar*; þ, ð, æ and ö stay as written.
- **Polish** notes give the aspect pair, *robić / zrobić*, irregular genitive and plural forms including masculine-personal plurals, *studenci*, and say when a word looks like a Ukrainian or Russian one but means something else, *dywan*, a carpet.

A configured language's AI fills cards unasked only while its evaluation passes the bar ([long-tail languages](proposals/long-tail-languages.md)); a new deck in a language below it starts with no AI fields until the owner turns them on.

`GET /api/languages` and [the docs](https://lymi.app/docs/languages) give every language's format from the records in `packages/core/src/languages`.

## Notes

Notes are read after the answer and are never needed to grade it. Empty notes are fine.

At most three lines, about 60 characters each, and each line is one of:

- **Forms the face does not show**, such as an imperative or a plural: "käsk: joo! · jooge!"
- **One contrast** with a look-alike: "сравни: nägema — видеть"
- **One usage point**: the case a verb takes, a collocation, a register warning: "+ партитив: kardan koera"

A second example, a full paradigm, etymology and grammar explanations belong in the lesson, not on the card.

## Choosing terms from a lesson

1. What the lesson marks first: glossed, bold, highlighted, underlined, drilled, or written in by hand.
2. Then frequent, useful words the learner does not have.
3. A term already in the learner's decks is skipped (ADR 0004). A second card for the same word is added only for a clearly different sense, with its own cue.
4. Page furniture is never a card: headings, row numbers, transcriptions, mnemonics columns, exercise instructions. A reading the lesson prints beside a term, such as furigana or a kana gloss, goes on that term's card as its pronunciation.

## Examples

| | Weak | Strong |
|---|---|---|
| Overloaded meaning | jooma → "пить; выпивать; поить; употреблять" | "jooma · juua · joon" → "пить" |
| Two right answers | mõtlema → "думать" (arvama fits too) | "mõtlema · mõelda · mõtlen" → "думать (размышлять)", note "сравни: arvama — считать" |
| Notes as a textbook | kartma, notes: full conjugation, three examples, etymology | kartma, one note: "+ партитив: kardan koera" |

## Where the rules come from

The minimum-information, interference and selective-mnemonic rules are from Piotr Woźniak's [Twenty rules of formulating knowledge](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge). Precise, consistent prompts with one answer are from Andy Matuschak's [How to write good prompts](https://andymatuschak.org/prompts/). L1 translations over L2 definitions for beginners follow Prince (1996) and Terai et al. (2021); related words learned together cause confusion errors in Nakata and Suzuki (2019). The three-line cap on notes and the principal-forms term are Lymi's own choices and are untested.
