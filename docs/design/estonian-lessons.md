# Estonian lessons

Free, interactive Estonian grammar lessons at `lymi.app/estonian/learn`, in English, Ukrainian and Russian. Each lesson is an article with things to hear, try and answer dropped into it. They need no account and keep progress in the visitor's browser. They are a way into Lymi for people learning Estonian, and they stay on the public site.

## Launch

The lessons are built and reachable but not launched: `learn` is in `prelaunchPages` in `apps/site/src/lib/routes.ts`, so every lesson page and the hub send `noindex`, stay out of the sitemap, and no other page links to them. Launching is removing `learn` from that list, which also puts every lesson page in the sitemap (`routes.test.ts` checks both states), and linking the hub from the Estonian page and the footer.

## The course

`apps/site/src/lib/learn/catalogue.ts` lists every lesson in order, built or planned, in six stages from A1 to B1. The scope follows Keeleklikk and Keeletee, the A2 and B1 level descriptions Harno uses for its exams, and EKI's *Eesti keele käsiraamat*, compared in November 2026. Every topic two or more of them teach has a lesson, including those a short course tends to skip: the future with hakkama, -ma/-mas/-mast, modal verbs, pronouns in every case, ordinals and dates, -gi/-ki, particle verbs at A2 and B1, verb government and word building. The order makes one change to theirs: sentences come first. After pronunciation, a learner says who they are, what they do and where they live, says no and asks, and only then learns numbers, the time and the days, so those words go straight into sentences they can already make. The place endings `-s` and `-l` and commands come early as phrases, a short lesson shows that stems change before the genitive needs it, and the verb's three forms come before the past tense. The rules that most learners trip on, consonant gradation and the total object, wait until the words are familiar. Every stage from the third ends with a practice lesson. Each lesson has a plain `name` in the reader's language, the words people search for, such as Past tense or The partitive case, and a built lesson has a `title` for its heading and search result, such as Estonian pronunciation. Its `et` is an Estonian phrase from the lesson, shown small beside the name, never instead of it.

A practice lesson, named “Practice: …”, follows the lessons it practises and teaches no new grammar. It is a normal lesson in the catalogue, numbered in order, built from the practice parts below with only what came before it, plus at most two glossed phrases.

## Colour

Each surface means one thing, so a learner can tell from the surface alone whether they are reading, trying or being marked.

| Surface | Means | Used by |
| --- | --- | --- |
| Canvas | Reading | Prose, headings |
| Plate (white) | Answering. Right and wrong, green and red, appear only here | Quizzes, lists to hear |
| Tray, in the stage's hue | Exploring, with nothing to get wrong | Keys, chips, the number builder, comparisons, What to remember |
| Amber | The one next step in view | Start, Check, Next |

Each stage has a hue (`hue` in the catalogue). A lesson sets it as `--h` on `.learn`, and `learn.css` derives the tray and the lesson's ink from it. Inside a quiz the hue marks only what the learner acts on: Listen, the chosen chip, the band behind the quiz's title. The quiz's round dots sit on a white pill so green and red never land on the hue. A `Scene` drawing has its own pigments, for cardboard, a roof, a lit room and the cat, set beside the hue in `learn.css` (`--scene-*`): they paint an illustration, not an interface, so they stay out of the design tokens. Inside a quiz the drawing's ground turns grey, and only the places to tap carry the hue.

## Components

The parts live in `apps/site/src/components/learn`. A new lesson reaches for these before writing markup of its own.

| Part | Use it for |
| --- | --- |
| `Word` | Any Estonian word in prose: `<Word w="kõrv" />` inside `<Trans>`. Resting on it for half a second opens its card with the meaning and a note; a tap plays it and keeps the card open. The cursor is the help cursor. |
| `PlayButton`, `Listen` | One clip; the sound a quiz round asks about. While a sound plays, its triangle becomes three moving bars and a ring leaves the button. |
| `ListenRows` | A list of things to hear on one plate, with an optional first column such as a numeral. The words at the end of a lesson are one. |
| `Panel` | The tray anything to play with sits on. |
| `Keys` | A row of sounds to press, with a line under it that explains the last key. Accent keys, for what is new, carry the hue and a dot. A key's word can light part of itself, such as an ending set under its digit. |
| `Chips` | Pick one of a few. |
| `Aside` | A short note that can be skipped, such as an exception or a comparison: a bordered callout with an info mark in the stage's ink. |
| `Compare` | Two words drawn as bars on one time scale, one bar per 12 ms, so the longer word takes more room. |
| `Paradigm` | A table of forms on the tray: a noun's cases, a verb's persons or tenses. Each form is written with `\|` before the part to light (`maja\|s`); a tap plays it, and the line under the table names it and says what its ending does. Optional: a first column of question words (`milles?`), an Estonian name under each row's label, and one row or column tinted with `highlight`. With more than one column the rows stack into a list on a narrow tray, each form keeping its column's name. |
| `Scene` | An illustrated scene on the tray, drawn flat in the lesson's colours. Pressing a place, on its key or on the drawing, moves the cat there and plays its sentence: around a box with `scene="box"` (`peal`, `all`, `taga`, `ees`, `korval`, `sees`), walking into, sitting in and coming out of a house with `scene="house"` (`majja`, `majas`, `majast`), or jumping onto, sitting on and jumping off a table with `scene="table"` (`lauale`, `laual`, `laualt`). The lesson gives each place its word, meaning, sentence and gloss; the scene knows where the place is and how the cat gets there. |
| `Timeline` | Tenses on a line, past to future, with a band for what a tense reaches to: the perfect reaches now. Each point plays its first example and shows how the verb is built, piece by piece (`ole\|n` + `söö\|nud`), with those words lit in the sentence. A point may hold two examples, as the future does with a time word and with hakkama. On a narrow tray the line stands upright. |
| `Morph` | A word turning into its forms, such as pood → poe → poes. Pressing a form plays it and turns the form before it into this one: dropped letters are struck, new ones grow in, lit and underlined. `morph()` in `apps/site/src/lib/learn/forms.ts` finds which letters stay. With reduced motion the marked word shows at once. |
| `OpeningHours` | A door sign with opening hours, written as Estonian shops write them: days as capital letters, hours on the 24-hour clock, `suletud` for closed. A sign quiz puts it on top of `PassageQuestions`. |
| `Quiz` with `ChoiceRound`, `GapRound`, `TypedRound` or `SceneRound` | Anything that marks the learner. A white card with its title on the stage's band, one Listen per round, the answers, a line of feedback, Next, and a score with Try again. The score lists the run's words as chips to hear again, misses marked, with a sparkle for a full score; give the quiz `recall` so it knows each round's word. A `TypedRound` item can bring its own `matches` and `prompt` when its answers can be typed many ways, as times are. A round can't be answered before its sound has played, except a `GapRound` with `listen="after"`, for a gap the sound would give away: the learner picks first and hears the sentence with the answer. Answers in a `ChoiceRound` share a row and grow alike, and a long one takes the room it needs, so labels fit in every locale. One flow drives every quiz: `quizReducer` in `apps/site/src/lib/learn/quiz.ts`. A `SceneRound` asks to hear a sentence, then tap the place on a `Scene` drawing: each place is a dashed outline of the cat, and once answered the cat appears at the right one. A place the drawing hides at rest, such as under the box, and the movements into and out of the house and onto and off the table have no outline, so they can't be the answer. |
| `Quiz` with `OrderRound` | Build a sentence from word tiles. The learner hears it first, or with `meaning` reads what it means and hears it only after Check. A tap adds a tile, a tap in the sentence takes it back, and a drag or the arrow keys move it. The bank lists tiles alphabetically, so it never gives the order away; `spare` tiles belong in no order. Every order in `answers` counts, and after Check the other right orders show under “Also right”. Tiles come from the first answer, its first word lowercased unless another answer writes it with a capital mid-sentence; pass `tiles` when the sentence starts with a name. `orderProblems` in `lib/learn/checks/order.ts` checks an item's answers in a lesson's tests. |
| `Quiz` with `FormRound` | A word and a cue (a case question, a person, “in the …”); the learner types the form or, with `options`, picks it. Typing ignores case, spaces and a full stop, and keys for õ ä ö ü š ž sit under the field without closing a phone's keyboard. Every form in `answers` counts. A wrong answer off only in its marks says so. Once answered, the word turns into its form as `Morph` draws it, dropped letters struck and added ones underlined in ink (pood → poes), and the form's clip plays. `formRecall` gives the quiz's `recall`. |
| `Listening` | Listen to a short passage, then answer. One recording plays as thin sound bars on a line, a group per sentence, the heard part in the stage's ink and the rest grey: a tap on a group starts that sentence, and arrow keys step between them. Every question shows at once with lettered answers, and one Check marks them all. The text appears after Check, with the sentences behind missed answers underlined. A pick before the passage has played asks the learner to listen first. |
| `Reading` | Read a short text, then answer. The text sits on the canvas, with an optional recording under it that highlights the sentence it reads. The questions are the same as `Listening`'s. Its glossary words open their cards only after Check, so a card can't give an answer away. |
| `GapPassage` with `mode="pick"` | A passage with gaps, filled one at a time. The open gap's words sit under the passage, and each gap is marked as it is filled, with the rule behind it. Nothing plays while the learner works; the whole passage can be heard at the end. |
| `GapPassage` with `mode="drag"` | A passage with gaps and one bank of words, some of them `spare`. The learner drags words into gaps, out of them and between them, or taps a word to put it in the open gap. A keyboard places a word with Enter. One Check marks every gap, and a wrong word is struck through beside the right one. |
| `Dialogue` | Practise a conversation. The other speaker talks in the second voice, and at each of the learner's turns they pick a reply in Estonian. A wrong pick says why, then Say it plays the right reply and the conversation goes on. There are no translations. With `text="sound"` the other speaker's lines arrive as sound only, each readable on request. |
| `Sort` | Six to ten words into two or three labelled bins: tap a word, then its bin, or drag it; a keyboard picks with Enter, places with the bin's number and takes a word back with Backspace. One Check marks every word; a wrong one stays in its bin, marked, with an arrow to its right bin, and the bin's `rule` (or the word's `why`) is listed under the bins. Then the score with each word as a chip. |
| `Match` | Four to six pairs across two columns, such as form and meaning or question word and ending: tap one side, then the other. A right pair locks with its number on both sides and plays its clip; a wrong one shakes and counts against the pair tapped first. The band's dots fill as pairs lock, green first time, red after a wrong try, and the score says how many wrong tries there were. |
| `QuizCard`, `ResultDots` | The card and round dots every marked part shares, for a new kind of practice. |

A lesson file in `components/learn/lessons` holds its glossary, its sections and its recap, and passes them to `LessonView`, which draws a link back to all lessons, the head, the read bar, What to remember, the words, and links to the previous and next lessons, the same size. The read bar shows where the reader is, filling in order up to the section on screen; which sections are done is kept for the hub, not shown in the bar.

## Writing a lesson

[The estonian-lesson skill](../../.agents/skills/estonian-lesson/SKILL.md) builds one lesson end to end, from choosing its content to the PR, with the checks reviews kept asking for.

- One question per lesson, answered in its heading and the line under it. Name a lesson by its topic, not a pun or a phrase.
- Two or three short paragraphs, then something to touch. Explore first, then answer.
- Every Estonian word in prose is a `Word` with a gloss.
- Listening only: nothing asks for the microphone.
- One idea per section. When a rule has two halves, such as -teist and -kümmend, give each half a section and its own explorer, then a section that puts them together.
- Don't give a section to something an explorer already shows. When one explorer holds every item, such as the seven days on one strip, its detail line explains each item: pressing a day says where its name comes from.
- Every lesson ends the same way: What to remember in three to five rules, then `LessonWords` on the stage's tray: a card with the first words as chips that opens to the full list, and under it, on the same tray, the way on to Lymi's free Estonian decks. Then the next lesson.
- English is the source; Ukrainian and Russian are transcreated, and a comparison uses the reader's own language where the match is accurate, as [Analogies by language](#analogies-by-language) lists.
- A teacher checks the Estonian before a lesson launches.

## Analogies by language

English is the source, but an English analogy is often the wrong one for a Ukrainian or Russian reader, whose own grammar is closer to Estonian on many points. The uk and ru lines are transcreated, so a line that teaches by comparison says the comparison that works in the reader's language, even when it differs from the English. A comparison must hold: name the point where it stops matching. Russian and Ukrainian get their own comparisons; never translate one from the other.

| Topic | English | Ukrainian | Russian |
| --- | --- | --- | --- |
| Cases | Endings do the work of in, on, from, with | Like the seven відмінки, but with endings for places instead of prepositions | Like the six падежей, with endings for places instead of prepositions |
| Mul on | “At me is”, no verb have | Same shape: у мене є | Same shape: у меня есть |
| Partitive after numbers | “Some”, “of”: two of the cats | After два, три, чотири the noun changes too (два коти), and after п’ять it is the genitive plural (п’ять котів); Estonian uses one form, singular, for every number | Два кота, пять котов: the noun changes after a number; Estonian uses one form, singular, for every number from two |
| Partitive for amounts | Some water | Води (налий води) | Воды (налей воды, купи хлеба) |
| Total and partial object | Finished or not: I read the book (to the end) / I was reading the book | Доконаний і недоконаний вид: прочитав книжку / читав книжку | Совершенный и несовершенный вид: прочитал книгу / читал книгу |
| Consonant gradation | Like the vowel in mouse, mice, but in the middle consonant | Like чергування: нога, нозі; рука, руці; кінь, коня | Like беглые гласные: день, дня; сон, сна; отец, отца |
| Mina, mind, mulle | I, me, to me | Я, мене, мені | Я, меня, мне |
| Mulle meeldib | “To me it pleases” | Мені подобається, same shape | Мне нравится, same shape |
| Past tense with ei | One form for every person: I didn't go, you didn't go | Я не пішов, ти не пішов: the Ukrainian past does not change for person either | Я не пошёл, ты не пошёл: the Russian past does not change for person either |
| Hakkama future | Will, going to | Буду вчитися: hakkan õppima | Буду учиться: hakkan õppima |
| Present for the future | I'm going tomorrow | Завтра йду в кіно | Завтра иду в кино |
| Translative -ks | Become a doctor | Стати лікарем (орудний) | Стать врачом (творительный) |
| Essive -na | As a doctor | Працювати лікарем, як лікар | Работать врачом, в качестве врача |
| Comitative -ga | With | З другом (орудний) | С другом (творительный) |
| Conditional -ks- | Would | Би: пішов би | Бы: пошёл бы |
| Let's, let them | Let's go, let him come | Ходімо, нехай прийде | Пойдём, пусть придёт |
| Impersonal -takse, -ti | They say, it is said | Кажуть; збудовано, зроблено (-но, -то) | Говорят; построили (неопределённо-личные) |
| Quotative -vat | Reportedly | Нібито, мовляв | Якобы, мол |
| -gi, -ki | Some-, any- | -сь, будь-: хтось, будь-хто; ніхто не, with a second negative | -то, -нибудь: кто-то, кто-нибудь; никто не, with a second negative |
| Particle verbs | Phrasal verbs: go away, get up | Префікси: ära minema, піти геть; välja minema, вийти | Приставки: ära minema, уйти; välja minema, выйти |
| Comparatives | -er, most | -ший, найбільш | -ее, самый |
| Adjective agreement | English adjectives never change | Like Ukrainian, the adjective takes the case, except before -ni, -na, -ta, -ga | Like Russian, the adjective takes the case, except before -ni, -na, -ta, -ga |
| Participles | Read book, reading man | Прочитана книжка; for loev, a reading one, Ukrainian prefers a clause: той, хто читає | Прочитанная книга, читающий человек |
| Verb second | Like questions in English, or German | Unlike Ukrainian's free order | Unlike Russian's free order |

## Practice parts

A lesson teaches with explorers and quizzes. The practice parts use the rule in context, after it is taught, and suit a later section of a lesson or a practice lesson of their own. `/components/lessons` shows each one working, and the four explorers above it (`Paradigm`, `Scene`, `Timeline`, `Morph`), in English, Ukrainian and Russian.

| Use | When the lesson wants |
| --- | --- |
| `Listening` | Understanding by ear: a passage of four to eight sentences, two to four questions about what was said. Ask about meaning, never about a form the learner could spot without understanding. |
| `Reading` | The same check by eye, for a text a little longer or harder than a passage the learner could follow by ear. Give its words a glossary; they open only after Check. |
| `GapPassage` `pick` | One rule met gap by gap, such as olema's forms or a case ending: each gap has its own two to four words, and each mark explains the rule at once. |
| `GapPassage` `drag` | Several rules in one text, read as a whole: each gap's word depends on the sentence around it, and spare words stop the last gap from answering itself. |
| `Sort` | One rule that splits words into kinds: `-s` or `-l`, a total or a partial object, ma or da verbs. Each bin gets a `rule` in one line; a word the rule doesn't cover gets its own `why`. |
| `Match` | Pairs to tell apart at a glance: forms and meanings, question words and endings, verbs and their particles. Keep each side short; a long meaning wraps at 375 px. |
| `Quiz` with `OrderRound` | Word order: the verb second, a question word first, particle verbs, clauses. List every order a teacher accepts; build from `meaning` once the words are known, from sound before. |
| `Quiz` with `FormRound` | Making a form from a dictionary word: a case, a person, a stem change. Type it when the learner should produce the ending; give `options` when the point is telling close forms apart. |
| `Dialogue` | Phrases used in turn: greetings, questions and answers, saying no. Give the learner a role in one line, so a reply can be wrong for its meaning as well as its grammar. Use `text="sound"` once the phrases are familiar. |

- Questions and wrong replies are in the reader's language; the passage, answers in gaps, and replies are Estonian.
- Each question names the sentence that answers it (`line`), so a missed answer points back at the passage.
- A passage and a dialogue use only what earlier lessons taught, plus at most a word or two the glossary explains.

## Sound

Every clip a lesson plays is listed in `apps/site/src/lib/learn/clips.ts`. `pnpm --filter @lymi/site lesson:audio` records what is new or changed into `apps/site/public/audio/estonian-lessons/<lesson>/`, at 64 kbps, and removes clips no lesson uses. `manifest.json` beside them holds each clip's text, model and voice.

A clip is a word or sentence in the main voice, the product's Estonian voice (`et` in `speech-voices.ts`); a line in the `second` voice, for the other speaker in a dialogue; or a passage, its `sentences` recorded as one take so it flows like speech. For a passage the script also saves when each sentence starts, as `<clip>.json` beside the recording, from ElevenLabs' character timings. The second voice is Liis, a voice from ElevenLabs' library made from a native Estonian speaker; the product itself has no second Estonian voice. The script brings every new clip to the same loudness (−18 LUFS) with ffmpeg, so the two voices play at one level. It needs ffmpeg installed.

## Progress and analytics

`apps/site/src/lib/learn/progress.ts` keeps which lessons a visitor started and finished, and which sections of each, in `localStorage`. A reading section counts once its end has been on screen, so a short one may count as soon as the page opens; a section with a quiz counts when its quiz ends. `learn_quiz_finished` and `learn_lesson_finished` ([analytics](../analytics.md)) answer whether visitors finish lessons and which quizzes they get right.
