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

## Chinese cards

- **Term**: the word in the script its deck's tag names, simplified or traditional; Lymi never converts between them.
- **Reading**: pinyin in tone marks and citation tones, as dictionaries write them: 学习 xuéxí, 不是 bù shì, 东西 dōngxi. Tone numbers, xue2xi2, are stored as marks.
- **Notes**: a noun's usual measure word, "*一本书*: 本 for books".
- **Example**: one short sentence with pinyin in square brackets after each word, one syllable per character, and none after punctuation, letters or digits: `我[wǒ]去[qù]银行[yínháng]。`.

## Cantonese cards

Only a `yue` or `zh-yue` tag is Cantonese; `zh-HK` is Chinese.

- **Term**: the word as written in Hong Kong, in traditional characters unless the tag says `Hans` or `CN`.
- **Reading**: Jyutping with a tone number from 1 to 6 after each syllable: 你好 nei5 hou2, 唔該 m4 goi1, 搭𨋢 daap3 lip1. Raised tone numbers, nei⁵, are stored as digits; Yale and pinyin are stored as written and never split one word into two cards.
- **Notes**: a noun's usual classifier, "*一本書*: 本 for books", and the Standard Written Chinese form where it differs.
- **Example**: one short sentence in written Cantonese (佢, 咗, 嘅, 唔), with Jyutping in square brackets after each word, one syllable per character: `我[ngo5]去[heoi3]銀行[ngan4 hong4]攞錢[lo2 cin2]。`.

The AI may add readings to an example someone else wrote only when the text is otherwise unchanged; it never rewrites it.

## Russian cards

- **Term**: the word as natives write it, with no stress marks.
- **Stress**: the term with U+0301 over the stressed vowel of each word of two or more syllables, stored as the pronunciation: замок read за́мок (castle) or замо́к (lock), and ё restored where the term writes е, еж read ёж. Empty when the term already shows its stress, every word having one syllable or ё: дом, ёлка. An accented Latin look-alike, замóк, is stored as the Cyrillic vowel and U+0301.
- **Notes**: a verb's aspect pair, *де́лать / сде́лать*, and a case other than the accusative; a noun's gender when the ending hides it and an irregular plural; the forms that show a stress moving, *го́род · города́*; and the homograph with its stress elsewhere, *за́мок* is a castle.
- **Example**: one short sentence with U+0301 over the stressed vowel of each word of two or more syllables, as that form is said, and none over ё or a word of one syllable: Я живу́ в Москве́. The marks never fade, because stress moves as a word changes form.

The AI may add stress marks to an example someone else wrote only when removing them gives the text back; it never rewrites it.

## Tamil cards

- **Term**: the word in written Tamil, as school, books and signs spell it, in Tamil script.
- **Reading**: Lymi reads each word's spelling itself and draws the reading over the word in Latin letters, long vowels with a macron and retroflex consonants with a dot below: பாடல் pāḍal, தங்கம் taṅgam. The pronunciation holds a reading only for a word not said as spelled, mostly a loanword: பஸ் bas. A pronunciation that repeats the spelling's reading, even in chat spelling (paadal), is stored empty.
- **Notes**: a verb's root with its past and future, *வா: வந்தேன் · வருவேன்*, and the spoken form where everyday speech differs, Spoken: *இருக்கு* (irukku). The spoken form never goes in the pronunciation.
- **Example**: one short sentence in written Tamil, in Tamil script only. It carries no readings; Lymi draws them.

## Korean cards

- **Pronunciation**: the term as it is said, in Hangul, only where that differs from the spelling: 학교 is said 학꾜, 국물 궁물. Empty for a word said as written, such as 사랑. No romanization, which a learner outgrows once they read Hangul.
- **Notes**: a verb or adjective's polite present form, 가다 → 가요. A Sino-Korean word gives each root's hanja and reading with one or two words that share it, 學 학: 학생, 학년, so one root opens a family of words. A native Korean word has no roots line.

## Other configured languages

- **Filipino** (`fil`, `tl`): the pronunciation is the term with its stress marks, an acute on the stressed vowel (báhay), a grave on a final vowel cut by a glottal stop (bátà) and a circumflex where both meet (basâ). Notes give a verb's root, its focus and its three aspects: *kumain · kumakain · kakain*.
- **Vietnamese** (`vi`): every word keeps its tone marks. The pronunciation is empty unless the term does not show how it is said: typed without tone marks (cam on → cảm ơn) or abbreviated (km → ki-lô-mét). Notes give a noun's classifier, *con chó*.
- **Georgian** (`ka`) and **Armenian** (`hy`): the pronunciation is a romanization, Georgian's national system with each ejective marked (ჭიქა ch'ika), and Eastern Armenian as it is said (քույր k'uyr).

- **Lithuanian** (`lt`): the pronunciation is the term with its accent mark as dictionaries print it, an acute, grave or tilde on the stressed syllable (nãmas, výras, kalbà); the marks are never stripped. The AI's accents miss often enough that a new Lithuanian deck starts with pronunciation off. Notes give a noun's nominative and genitive and a verb's three forms: *eiti · eina · ėjo*.
- **Estonian, Finnish and Latvian** are read as written, so the pronunciation stays empty; notes give the principal forms, Finnish's with the plural partitive so consonant gradation shows, *katu · kadun · katua · katuja*, and for Latvian the genitive and any gender the ending hides: *suns, suņa*.
- **Swedish**, **Norwegian** (`nb`, `nn`; a plain `no` means Bokmål), **Danish** and **Dutch**: notes give a noun's gender or article with its definite and plural forms, *en bil, bilen, biler*, and a strong verb's forms; Nynorsk cards use Nynorsk forms, *ein bil, bilen, bilar*. A word told apart only by pitch accent says which, *anden*, accent 2: the spirit.
- **Danish** pronunciation is IPA as Den Danske Ordbog writes it, with stød and without the letters that are not said: hus ˈhuˀs.
- **Icelandic** notes give gender and nominative · genitive singular · nominative plural, *hestur, hests, hestar*; þ, ð, æ and ö stay as written.
- **Polish** notes give the aspect pair, *robić / zrobić*, irregular genitive and plural forms including masculine-personal plurals, *studenci*, and say when a word looks like a Ukrainian or Russian one but means something else, *dywan*, a carpet.

- **German** notes give a noun's plural, a strong verb's forms and a separable verb's prefix, *ein|kaufen*; the term keeps its article, and duplicates still compare it.
- **French** pronunciation is IPA, with each liaison in a phrase marked ‿; notes give an adjective's irregular feminine and plural, *beau, belle, beaux*.
- **Spanish** and **Italian** keep every written accent, *árbol*, *città*; notes give stem changes and irregular forms, and Italian's *essere*.
- **Portuguese**: `pt` and `pt-PT` are said as in Portugal and `pt-BR` as in Brazil, each in IPA; notes give the other variety's word where they differ, *ônibus* or *autocarro*.
- **Hungarian** keeps its long vowels; notes give the indefinite and definite present, *olvas · olvassa*, -ik verbs and irregular accusatives, *tűz → tüzet*.
- **Czech** keeps háček, čárka and ů; notes give the aspect pair, *dělat / udělat*, and irregular forms, *člověk, lidé*.

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
