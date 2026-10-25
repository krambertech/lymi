# Writing cards

How a Lymi card is written, for anyone who writes one: a learner, a publisher of a public deck, and the AI when it reads a lesson or enriches a card. The lesson prompt in `apps/web/src/server/lessons/prompt.ts`, the enrichment prompt and guides in `apps/web/src/server/enrichment/`, and the language modules in `apps/web/src/server/languages/` encode these rules, so a change here is a change there.

A good card asks one thing and has one normal answer. Everything else on it is optional reading after the answer.

## The rules

1. **One term, one sense.** A card with two words or two senses fails on either part and stays hard. A word with two senses the learner needs gets two cards, each with its own meaning.
2. **The meaning is one short translation in the learner's language, one to three words.** A list of synonyms is harder to recall than any one of them. Write the sense the lesson teaches, not every sense the dictionary has. Where a card keeps two senses, they are split by "; " (bench; bank), never " / " or " · ".
3. **Production has one right answer.** When a meaning fits more than one term, add a short cue in parentheses so only this term fits: "думать (размышлять)" for mõtlema, "думать (считать)" for arvama. A card with two right answers marks the learner wrong for knowing the other one.
4. **The term is the citation form, in the deck's fixed shape.** Estonian verbs carry their three principal forms ("jooma · juua · joon"), a German noun carries its article. The shape is the same for every card of that kind in the deck, and the forms are copied as the lesson prints them.
5. **The example is one short sentence in the language being learned, where every other word is easier than the term, at most 250 characters as shown.** It shows the word in use; it is not what the learner recalls. Its translation goes in its own field, never in brackets after it or in the notes, and is one natural sentence in the meaning language that uses the card's meaning for the term.
6. **Nothing on the cue side gives the answer away.** An example, note or hint that spells the term turns production into reading.
7. **Look-alikes get a contrast line on both cards.** Similar words and near-synonyms learned together are the most common cause of forgetting. One line ("Сравни: *arvama*, считать") is cheaper than splitting the lesson.
8. **A hint is for a word that keeps failing, not for every card.** Mnemonics help when chosen, so the learner writes one, often when review offers it for an often-forgotten card. A hint leads back to the term without spelling it.
9. **A card that keeps failing is split or rewritten, not given more notes.**
10. **One format per deck.** The same term shape, the same meaning style and the same note labels on every card, so the deck reads as one voice and the AI can copy it.

## Japanese cards

A Japanese card is shaped by its language, with no setting of its own:

- **Term**: the dictionary form, written as natives write it: 食べる, 学校, and kana alone for a word normally written in kana, such as ありがとう or たくさん.
- **Reading**: the term's reading in hiragana, たべる, stored as the pronunciation and drawn over the kanji as furigana. Empty for a term written only in kana. No romaji.
- A term sent with its reading inline, `食[た]べる`, is stored as the term 食べる with the Reading たべる when every kanji has a kana reading and no other pronunciation was sent; anything else is stored as written.
- **Notes**: the word type alone on the first line, "Ichidan verb", then "Polite: *食べます*" and a transitive or intransitive pair when there is one; a special counter, a suru noun's "With する: *勉強する*", a particle trap, or for a word of two or more kanji "Characters: 果 fruit, 物 thing".
- **Example**: one short sentence with a reading in square brackets after each run of kanji, and none over kana: `毎朝[まいあさ]パンを食[た]べます。`. A reading over a longer stretch, Anki's `食べます[たべます]`, is read the same way.

## Chinese cards

- **Term**: the word in the script its deck's tag names, simplified or traditional; Lymi never converts between them.
- **Reading**: pinyin in tone marks and citation tones, as dictionaries write them: 学习 xuéxí, 不是 bù shì, 东西 dōngxi. Tone numbers, xue2xi2, are stored as marks.
- **Notes**: a noun's "Measure word: *本*, *一本书*", a near-synonym learners mix, *二 / 两*, or for a word of two or more characters "Characters: 电 electric, 脑 brain". Never the pinyin.
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
- **Notes**: stress on every form. A verb's "Perfective: *сде́лать*" and a case other than the accusative, "+ instrumental: *занима́ться*"; a noun's gender when the ending hides it and a plural that is irregular or moves the stress, "Plural: *города́*"; the homograph, "Stressed elsewhere: *за́мок*, a castle".
- **Example**: one short sentence with U+0301 over the stressed vowel of each word of two or more syllables, as that form is said, and none over ё or a word of one syllable: Я живу́ в Москве́. The marks never fade, because stress moves as a word changes form.

## Ukrainian cards

- **Term**: the word as natives write it, with no stress marks; ’, ʼ and ' are one apostrophe.
- **Stress**: the term with U+0301 over the stressed vowel of each word of two or more syllables, stored as the pronunciation: дорога read доро́га (road) or дорога́ (dear), брати read бра́ти (to take) or брати́ (brothers). Empty when every word has one syllable: дім, п'ять. Nothing is restored, since ї's dots are part of the letter.
- **Notes**: stress on every form. A verb's "Perfective: *купи́ти*" and a case other than the accusative, "+ dative: *дя́кувати*"; a noun's gender when the ending hides it and a plural that is irregular or moves the stress, "Plural: *ру́ки*"; the homograph, "Stressed elsewhere: *за́мок*, a castle"; and a word that looks Russian but means something else, *неді́ля*, Sunday, not a week.
- **Example**: one short sentence in Ukrainian, never Russian, marked as a Russian example is: Я живу́ в Ки́єві.

The AI may add stress marks to a Russian or Ukrainian example someone else wrote only when removing them gives the text back; it never rewrites it.

## Tamil cards

- **Term**: the word in written Tamil, as school, books and signs spell it, in Tamil script.
- **Reading**: Lymi reads each word's spelling itself and draws the reading over the word in Latin letters, long vowels with a macron and retroflex consonants with a dot below: பாடல் pāḍal, தங்கம் taṅgam. The pronunciation holds a reading only for a word not said as spelled, mostly a loanword: பஸ் bas. A pronunciation that repeats the spelling's reading, even in chat spelling (paadal), is stored empty.
- **Notes**: a verb's root with its past and future, *வா: வந்தேன் · வருவேன்*, and the spoken form where everyday speech differs, Spoken: *இருக்கு* (irukku). The spoken form never goes in the pronunciation.
- **Example**: one short sentence in written Tamil, in Tamil script only. It carries no readings; Lymi draws them.

## Korean cards

- **Pronunciation**: the term as it is said, in Hangul, only where that differs from the spelling: 학교 is said 학꾜, 국물 궁물. Empty for a word said as written, such as 사랑. No romanization, which a learner outgrows once they read Hangul.
- **Notes**: a verb or adjective's "Polite: *가요*" and "Irregular: ㅂ" where it is; the honorific, "For elders: *드시다*"; a Sino-Korean word's roots, "Hanja: 學 학, as in *학생*, *학년*", so one root opens a family of words. A native Korean word has no hanja line.

## Other configured languages

Notes labels are written here in English; a card writes them in its meaning language.

- **Filipino** (`fil`, `tl`): the pronunciation is the term with its stress marks, an acute on the stressed vowel (báhay), a grave on a final vowel cut by a glottal stop (bátà) and a circumflex where both meet (basâ). Notes give a verb's root, its focus and "Aspects: *kumain · kumakain · kakain*".
- **Vietnamese** (`vi`): every word keeps its tone marks. The pronunciation is empty unless the term does not show how it is said: typed without tone marks (cam on → cảm ơn) or abbreviated (km → ki-lô-mét). Notes give "Classifier: *con chó*" and the other region's word, "In the south: *chén*".
- **Georgian** (`ka`) and **Armenian** (`hy`): the pronunciation is a romanization, Georgian's national system with each ejective marked (ჭიქა ch'ika), and Eastern Armenian as it is said (քույր k'uyr). Georgian notes give a verb's Present and Aorist, third person, under its verbal noun.
- **Lithuanian** (`lt`): the pronunciation is the term with its accent mark as dictionaries print it, an acute, grave or tilde on the stressed syllable (nãmas, výras, kalbà); the marks are never stripped. The AI's accents miss often enough that a new Lithuanian deck starts with pronunciation off. Notes give a noun's Genitive and a verb's Present and Past.
- **Estonian, Finnish and Latvian** are read as written, so the pronunciation stays empty. Estonian notes give the three forms on one line when the term does not show them, "Forms: *tulema · tulla · tulen*", then a past, short illative or imperative that is hard to guess. Finnish notes give Genitive, Partitive and Partitive plural, so consonant gradation shows, and a verb's Present and Past. Latvian notes give the Genitive and a gender the ending hides.
- **Swedish**, **Norwegian** (`nb`, `nn`; a plain `no` means Bokmål), **Danish** and **Dutch**: notes give a noun's article where the term lacks it, its Definite and Plural, and a verb's Present, Past and Supine or Perfect; Dutch gives a strong verb's Past and "Perfect: *is gekomen*" and a separable prefix, *op|bellen*. Nynorsk cards use Nynorsk forms. A word told apart only by pitch accent says which, "Accent 2: *anden*, the spirit".
- **Danish** pronunciation is IPA as Den Danske Ordbog writes it, with stød and without the letters that are not said: hus ˈhuˀs.
- **Icelandic** notes give Gender, Genitive and Plural, and a strong verb's Past and Participle; þ, ð, æ and ö stay as written.
- **Polish** notes give "Perfective: *zrobić*", "Present: *robię, robisz*", a gender the ending hides, a genitive that changes the stem and an irregular or masculine-personal plural, "Plural: *studenci*"; for a Ukrainian or Russian reader, a false friend, *dywan*, a carpet. A word not stressed on the second-to-last syllable gets the term with a grave accent on that vowel as its pronunciation: mùzyka, never an acute, which turns o into the letter ó.
- **Czech** keeps háček, čárka and ů; notes give "Perfective: *udělat*", "Present: *dělám*", a hidden gender, the Genitive and an irregular "Plural: *lidé*".

- **German** notes give a noun's Plural, a strong verb's Present only when the vowel changes, Past and "Perfect: *ist gefahren*", a separable prefix, *ein|kaufen*, and a fixed preposition with its case; the term keeps its article, and duplicates still compare it.
- **French** pronunciation is IPA, with each liaison in a phrase marked ‿; notes give a gender the article hides, an irregular Plural, an adjective's irregular "Feminine: *belle*", a verb's irregular Present, its Participle, and a "With *être*" line.
- **Spanish** and **Italian** keep every written accent, *árbol*, *città*. Spanish notes give "Present: *tengo, tienes*", an irregular Preterite, a hidden gender and the word Spain or Latin America says instead. Italian notes give an irregular Present and Participle, "Past with *essere*: *sono venuto*" and an irregular "Plural: *le uova*"; a word stressed before its second-to-last syllable gets the term with a grave accent as its pronunciation, telèfono.
- **Portuguese**: `pt` and `pt-PT` are said as in Portugal and `pt-BR` as in Brazil, each in IPA; notes give an irregular Present, Past and Participle, a hidden gender, and the other variety's word where they differ, "In Portugal: *autocarro*" on a `pt-BR` card.
- **Hungarian** keeps its long vowels; notes give "Present: *olvas · olvassa*", -ik verbs, and irregular plurals and accusatives, "Accusative: *tüzet*".
- **English**: the pronunciation is IPA in one standard per deck; notes give an irregular verb's Past and Participle unless the term shows them, an irregular Plural, Uncountable, the preposition it takes, and a false friend for the reader.

## Languages with a guide only

Greek, Turkish, Romanian, Serbian, Arabic, Hebrew and Hindi have no language record, so their enrichment guide alone says how they are written. A romanization, or Serbian's Latin spelling, is the pronunciation where the script does not show the sound.

- **Greek** (`el`): a noun keeps its article, a verb is listed in the first person present. The pronunciation is a simple romanization with an acute on the stressed vowel, píno, efcharistó. Notes give Plural, a Genitive whose stress moves, and a verb's Past and Future.
- **Turkish** (`tr`): read as written, so the pronunciation stays empty. Notes give a verb's Present, Aorist and Past and a noun's Accusative and Plural, which show vowel harmony and softening, and the case a verb takes.
- **Romanian** (`ro`): the pronunciation is the term with an acute on the stressed vowel of each word of two or more syllables, a fáce. Notes give every noun's Gender, Definite and Plural, and a verb's Present and Participle; ș and ț take a comma below.
- **Serbian** (`sr`): the term and example are Cyrillic and ekavian; the pronunciation is the term in Latin script, letter for letter, ćevapi. Notes give the aspect pair, the Present, and the Croatian word where it differs.
- **Arabic** (`ar`): Modern Standard Arabic, fully vowelled. The pronunciation is a romanization with macrons for long vowels and ʿ ʾ ḥ ṣ ḍ ṭ ẓ gh, kitāb. Notes give each form with its romanization after it, "Plural: *كُتُب* (*kutub*)", a verb's Present and verbal noun, and a root line.
- **Hebrew** (`he`): unpointed. The pronunciation is a romanization with an acute on the stressed vowel, séfer. Notes give gender, Plural, a verb's Binyan and Present, and a root line.
- **Hindi** (`hi`): Devanagari. The pronunciation is a romanization with macrons and ṃ for nasal vowels, karnā. Notes give every noun's gender, a changing Plural, an irregular Past, whether a verb takes *ने*, and a woman's form or an Urdu or Sanskrit doublet.

A configured language's AI fills cards unasked only while its evaluation passes the bar ([long-tail languages](proposals/long-tail-languages.md)); a new deck in a language below it starts with no AI fields until the owner turns them on.

`GET /api/languages` and [the docs](https://lymi.app/docs/languages) give every language's format from the records in `packages/core/src/languages`.

## Notes

Notes are read after the answer and are never needed to grade it. Empty notes are fine when nothing is irregular.

Each line is one fact: a label in the meaning language and a form in italics, "Plural: *die Städte*", "Perfect: *ist gefahren*". A label alone can name a word's type, "Godan verb".

- **Forms first**, in the order the language gives, and only forms the term does not show that a learner cannot build from the rules.
- **Then at most one usage line**: the case or preposition the word takes, "+ partitive: *kardan koera*"; a look-alike, "Сравни: *nägema*, видеть"; a register or regional word, "In Portugal: *autocarro*"; or a meaning that surprises.
- Usually two to four lines, never more than six. `*italic*` for words in the language, `**bold**` for the one form to notice, and a short gloss after a form follows a comma. No lists, headings or " = " translations.

The reading belongs in the pronunciation and an example in the example field; an example's translation waits for its own field. A second example, a full paradigm, etymology and grammar explanations belong in the lesson, except the character or root line a language asks for.

## Choosing terms from a lesson

1. What the lesson marks first: glossed, bold, highlighted, underlined, drilled, or written in by hand.
2. Then frequent, useful words the learner does not have.
3. A term already in the learner's decks is skipped (ADR 0004). A second card for the same word is added only for a clearly different sense, with its own cue.
4. Page furniture is never a card: headings, row numbers, transcriptions, mnemonics columns, exercise instructions. A reading the lesson prints beside a term, such as furigana or a kana gloss, goes on that term's card as its pronunciation.

## Examples

| | Weak | Strong |
|---|---|---|
| Overloaded meaning | jooma → "пить; выпивать; поить; употреблять" | "jooma · juua · joon" → "пить" |
| Two right answers | mõtlema → "думать" (arvama fits too) | "mõtlema · mõelda · mõtlen" → "думать (размышлять)", note "Сравни: *arvama*, считать" |
| Notes as a textbook | kartma, notes: full conjugation, three examples, etymology | kartma, one note: "+ партитив: *kardan koera*" |

## Where the rules come from

The minimum-information, interference and selective-mnemonic rules are from Piotr Woźniak's [Twenty rules of formulating knowledge](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge). Precise, consistent prompts with one answer are from Andy Matuschak's [How to write good prompts](https://andymatuschak.org/prompts/). L1 translations over L2 definitions for beginners follow Prince (1996) and Terai et al. (2021); related words learned together cause confusion errors in Nakata and Suzuki (2019). The labeled-line notes and the principal-forms term are Lymi's own choices and are untested.
