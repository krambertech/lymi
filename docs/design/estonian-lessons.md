# Estonian lessons

Free, interactive Estonian grammar lessons at `lymi.app/estonian/learn`, in English, Ukrainian and Russian. Each lesson is an article with things to hear, try and answer dropped into it. They need no account and keep progress in the visitor's browser. They are a way into Lymi for people learning Estonian, and they stay on the public site.

## Launch

The lessons are built and reachable but not launched: `learn` is in `prelaunchPages` in `apps/site/src/lib/routes.ts`, so every lesson page and the hub send `noindex`, stay out of the sitemap, and no other page links to them. Launching is removing `learn` from that list, which also puts every lesson page in the sitemap (`routes.test.ts` checks both states), and linking the hub from the Estonian page and the footer. `learnReview`, the review page, stays on the list after launch: it holds nothing until a visitor has answered something.

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

## Loading

The lessons cost every other page nothing. Their stylesheet, `learn.css`, is imported by `learn-page.tsx`, so only the hub, the review page, a lesson and the kit page load it. Only the hub, a lesson's page and the kit page import lesson code, and each loads its own part: `LearnPage` in `components/learn/learn-page.tsx` imports the lesson whose file is its slug in PascalCase (`mina-sina-tema` is `MinaSinaTema.tsx`), with its catalog in the reader's language. The page's frontmatter calls `prepareLearnPage` first, so the lesson is ready before the server renders it.

When a lesson's code or catalog can't load, such as just after a deploy replaced it, the page keeps the article the server rendered and `LearnReload` offers to reload it. Its two lines live in the site's catalog, because the lesson's own may be what failed.

A drill bank is a module of its own, `<File>.drills.ts` beside the lesson. No page loads one until the learner presses Start, Warm-up or Review, and then it loads only the banks and catalogs of the lessons asked about, through `drill-banks.ts`. The hub counts what is due from the visitor's stored answers without loading any.

Each lesson has its own Lingui catalogs in `apps/site/src/locales/learn/<File>/`, the kit, hub and course names share `locales/learn/Kit/`, and the site's own catalogs hold no lesson text. `apps/site/lingui.config.ts` finds a new lesson by its file, and a lesson's drill bank shares its catalog. `lesson-isolation.mjs` fails the site's build when a page outside the lessons would load a module or catalog of theirs, at once or on demand, and `pnpm i18n:check` fails when a lesson's line is in the site's catalog.

## Components

The parts live in `apps/site/src/components/learn`. A new lesson reaches for these before writing markup of its own.

| Part | Use it for |
| --- | --- |
| `Word` | Any Estonian word in prose: `<Word w="kõrv" />` inside `<Trans>`. Resting on it for half a second opens its card with the meaning and a note; a tap plays it and keeps the card open. The cursor is the help cursor. It flows as text, so a full stop or comma after it never wraps onto a line of its own. |
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
| `FormMap` | A word's three base forms, by their official names (-ma infinitive, -da infinitive, present; nominative, genitive, partitive), and what is built from each. It opens on a word and its forms. Pressing a form draws a line to its uses, each one a stop; pressing a use opens two to four sentences with different words, the form lit. One form and one use are open at a time at every width, and a pressed line stays where it is when one above it closes; on a wide tray the sentences sit beside the uses. Changing the word turns every form in view into the new word's, letter by letter. A use where the word breaks the pattern says so in a few words, and one that never happens says Not with that word. `known={usesTaughtBy(slug)}` leaves the stops of later uses hollow and names the lesson that teaches them, so the map fills in as the course goes. `kind` keeps it to verbs or nouns, and `start` opens it on a word, a use or the table. The table is the same data: uses down, the three forms across, stacked by form on a narrow tray. |
| `FormSheetButton`, `FormSheet` | The form map's table for one word, opened over the page on the use in question: a centred sheet on a wide screen, from the bottom edge on a phone. Any lesson or wrong answer can show the button; `FormSheet` is the sheet alone, for a part that has its own button. It sets its hue from where it was opened. |
| `Turning` | A form that turns into another letter by letter when it changes, and settles as plain text: what the form map's words do. |
| `OpeningHours` | A door sign with opening hours, written as Estonian shops write them: days as capital letters, hours on the 24-hour clock, `suletud` for closed. A sign quiz puts it on top of `PassageQuestions`. |
| `Quiz` with `ChoiceRound`, `GapRound`, `TypedRound` or `SceneRound` | Anything that marks the learner. A white card with its title on the stage's band, one Listen per round, the answers, a line of feedback, Next, and a score with Try again. The score lists the run's words as chips to hear again, misses marked, with a sparkle for a full score; give the quiz `recall` so it knows each round's word. A `TypedRound` item can bring its own `matches` and `prompt` when its answers can be typed many ways, as times are. A round can't be answered before its sound has played, except a `GapRound` with `listen="after"`, for a gap the sound would give away: the learner picks first and hears the sentence with the answer. Answers in a `ChoiceRound` share a row and grow alike, and a long one takes the room it needs, so labels fit in every locale. One flow drives every quiz: `quizReducer` in `apps/site/src/lib/learn/quiz.ts`. A `SceneRound` asks to hear a sentence, then tap the place on a `Scene` drawing: each place is a dashed outline of the cat, and once answered the cat appears at the right one. A place the drawing hides at rest, such as under the box, and the movements into and out of the house and onto and off the table have no outline, so they can't be the answer. |
| `Quiz` with `OrderRound` | Build a sentence from word tiles. The learner hears it first, or with `meaning` reads what it means and hears it only after Check. A tap adds a tile, a tap in the sentence takes it back, and a drag or the arrow keys move it. The bank lists tiles alphabetically, so it never gives the order away; `spare` tiles belong in no order. Every order in `answers` counts, and after Check up to three other right orders show under “Also right”, in the order `answers` lists them. Tiles come from the first answer, its first word lowercased unless another answer writes it with a capital mid-sentence; pass `tiles` when the sentence starts with a name. `orderProblems` in `lib/learn/checks/order.ts` checks an item's answers in a lesson's tests. |
| `Quiz` with `FormRound` | A word and a cue (a case question, a person, “in the …”); the learner types the form or, with `options`, picks it. Typing ignores case, spaces and a full stop, and keys for õ ä ö ü š ž sit under the field without closing a phone's keyboard. Every form in `answers` counts. A wrong answer off only in its marks says so. Once answered, the word turns into its form as `Morph` draws it, dropped letters struck and added ones underlined in ink (pood → poes), and the form's clip plays. `formRecall` gives the quiz's `recall`. |
| `Quiz` with `SentenceRound` | Write a whole sentence. Five kinds of item: `dictation` (hear it, again or at three-quarter speed, and type it; with `word: true` it asks for one word, as the pronunciation lesson does), `translate` (from the reader's language), `rewrite` (an Estonian sentence and a cue, such as in the past, say no, about many), `ask` (write the question an Estonian sentence answers) and `build` (dictionary words to make into a sentence). The field grows; Enter checks. Every sentence in `answers` counts, in the order its words are written, so list other orders and pronouns. [Marking a written sentence](#marking-a-written-sentence) says what counts. Once checked, the learner's sentence and the closest accepted one show word by word: struck words are wrong, underlined ones were missed, a dashed gap is a word left out. Up to three more of `answers`, in the order they are listed, show under “Also right”, so list the most useful ones first; the clip, which says the first answer, plays. `sentenceRecall` gives the quiz's `recall`. |
| `Quiz` with `FixRound` | An Estonian sentence with one wrong word, as learners write it. The learner taps the wrong word, then types the right form. Tapping a word that is right says so and lets the learner look on, so they still get to fix it, but the round no longer counts. Finding and fixing are marked on lines of their own, and the round is right only with both. `wrong` and each of `answers` differ in one word, the same one. `fixRecall` gives the quiz's `recall`. |
| `Listening` | Listen to a short passage, then answer. One recording plays as thin sound bars on a line, a group per sentence, the heard part in the stage's ink and the rest grey: a tap on a group starts that sentence, and arrow keys step between them. Every question shows at once with lettered answers, and one Check marks them all. The text appears after Check, with the sentences behind missed answers underlined. A pick before the passage has played asks the learner to listen first. |
| `Listening` with `turns` | The same for a conversation, an interview, a voice message or an announcement of up to three and a half minutes. The player draws a line per speaker, named by `names`, with a piece per sentence where that speaker talks. A tap on the lines starts the sentence under it; under them are the sentence before and after, five seconds back, and 0.75× or 1×, which keeps the voice's pitch. After Check the text shows by turn with each speaker's name, and a button plays from that turn. |
| `Listening` with `plays={2}` | Exam mode: the questions can be read first, the recording plays at most that many times, and there is no pausing, going back or seeking. A play cut short by another sound or a call carries on from where it stopped and costs nothing more. After Check the player and the text are gone; Try again gives the plays back. |
| `Reading` | Read a short text, then answer. The text sits on the canvas, with an optional recording under it that highlights the sentence it reads. The questions are the same as `Listening`'s, in any of the four types. Its glossary words open their cards only after Check, so a card can't give an answer away. |
| `GapPassage` with `mode="pick"` | A passage with gaps, filled one at a time. The open gap's words sit under the passage, and each gap is marked as it is filled, with the rule behind it. Nothing plays while the learner works; the whole passage can be heard at the end. |
| `GapPassage` with `mode="drag"` | A passage with gaps and one bank of words, some of them `spare`. The learner drags words into gaps, out of them and between them, or taps a word to put it in the open gap. A keyboard places a word with Enter. One Check marks every gap, and a wrong word is struck through beside the right one. |
| `Dialogue` | Practise a conversation. The other speaker talks in the second voice, and at each of the learner's turns they pick a reply in Estonian. A wrong pick says why, then Say it plays the right reply and the conversation goes on. There are no translations. With `text="sound"` the other speaker's lines arrive as sound only, each readable on request. |
| `Writing` | Write a short text, such as a message, then compare it with a model. The learner types into a field with the Estonian letters and taps Show the model; their text appears above the model, which can play, and a checklist of what the text should do. They tick what theirs does and tap Done. Nothing is marked for them. |
| `Sort` | Six to ten words into two or three labelled bins: tap a word, then its bin, or drag it; a keyboard picks with Enter, places with the bin's number and takes a word back with Backspace. One Check marks every word; a wrong one stays in its bin, marked, with an arrow to its right bin, and the bin's `rule` (or the word's `why`) is listed under the bins. Then the score with each word as a chip. |
| `Match` | Four to six pairs across two columns, such as form and meaning or question word and ending: tap one side, then the other. A right pair locks with its number on both sides and plays its clip; a wrong one shakes and counts against the pair tapped first. The band's dots fill as pairs lock, green first time, red after a wrong try, and the score says how many wrong tries there were. |
| `Drill` | The end of a lesson with a bank: ten of its questions, mixed across its rules. A miss comes back later in the run until it is right twice, then the result says how each rule went and links to the section that teaches it. “Ten more” goes on with questions not yet met. `LessonView` adds it, as a section the lesson needs to be done. |
| `WarmUp` | Up to five questions from earlier lessons, offered at the top of a lesson once the visitor has answered some on an earlier day. `LessonView` adds it. |
| `QuizCard`, `ResultDots` | The card and round dots every marked part shares, for a new kind of practice. |

A lesson file in `components/learn/lessons` holds its glossary, its sections and its recap, and passes them to `LessonView`, which draws a link back to all lessons, the head, the read bar, What to remember, the words, and links to the previous and next lessons, the same size. The read bar shows where the reader is, filling in order up to the section on screen; which sections are done is kept for the hub, not shown in the bar.

The form map's words, uses and sentences are in `lib/learn/form-map.ts`, and its moves in `form-map-state.ts`. A use is a family: its label names one example, as in After words like “must”, its sentences show others, and no single case stands for the rule. A rule with exceptions says usually. Each word needs every use of its kind, `null` where it never happens; `form-map.test.ts` checks that, the lit part of each sentence, the lesson that teaches each use and every Estonian form against `verified-forms.json`, which `lesson:forms` fills. The map has no clips of its own yet: it plays the ones lessons have recorded, and `FORM_MAP_CLIPS` lists what is left. To record them, add `"form-map"` with that list to `CLIPS`, run `lesson:audio` and set `FORM_MAP_RECORDED`.

## Lesson types

The course should be enough, with Lymi for the words, to learn Estonian to B1 alone. A lesson is one of these types, named in its facts line.

| Type | Job | Holds |
| --- | --- | --- |
| Grammar | One rule | Explore, then recognise, tell apart, make, use |
| Contrast | Two rules learners mix up, such as a whole or a part, or emal and ema juures | The same sentence under each rule, then mixed items that only the meaning decides |
| Situation | A place or task, such as a café, the doctor, a form to fill | Phrases heard, a dialogue, a listening passage, something to write |
| Listening | Understanding by ear at the stage's length | Two or more recordings with exam question types |
| Writing | A short text with a model answer and a checklist the learner marks | A prompt, the model, the checklist |
| Checkpoint | What a stage taught, mixed | No explanations; a result per rule, each linked to its lesson |
| Exam | An A2 or B1 paper in Harno's format | Original tasks, timed, recordings played twice |

A tool, such as the form map or a number trainer, sits inside the lessons that use it. It is one component with its own data that takes no lesson's state, so it can become a page of its own later.

## What every lesson holds

A grammar or contrast lesson takes the learner from noticing a rule to using it without looking:

1. **Warm-up.** Up to five questions from earlier lessons, the learner's misses first.
2. **Explore** the new rule, with nothing to get wrong.
3. **Recognise** it by ear or eye.
4. **Tell it apart** from the rule it is confused with.
5. **Make** it: type the form, then the whole sentence.
6. **Use** it in a passage, dialogue or short text.
7. **Drill.** More of the same, missed items returning until each is right twice.

At least six marked parts, two of them typed, one listening and one that tells two rules apart, with at least forty marked items between them. Explanations stay in sentences: a table of forms is something to look up, never the exercise. Errors to fix come from what learners write, as Harno's A2 and B1 handbooks and EKI's grammar profile record them.

## How hard each stage is

| Stage | Sentences | Longest listening | Reading | Typed work |
| --- | --- | --- | --- | --- |
| 1 | 2 to 6 words | 10 to 20 s, one voice or a short exchange | 30 to 50 words | Words and numbers |
| 2 | 3 to 7 | 20 to 30 s, two voices | 50 to 70 | Forms, short sentences |
| 3 | 4 to 9 | 45 to 60 s, two voices, a voice message | 80 to 100 | Sentences |
| 4 | 5 to 10 | 60 to 90 s, two or three voices | 100 to 130 | Sentences, a message of 30 words |
| 5 | 6 to 12, two clauses | about 2 minutes | 130 to 170 | A message of 50 words |
| 6 | 8 to 15, linked clauses | 2.5 to 3.5 minutes, interviews and news | 200 to 300 | A letter of about 100 words |

Stages 3 to 5 reach what the A2 exam asks and stage 6 what B1 asks, in length and in question types: pick of three, true or false, one or two words, matching, and gaps from a bank.

## Writing a lesson

[The estonian-lesson skill](../../.agents/skills/estonian-lesson/SKILL.md) builds one lesson end to end, from choosing its content to the PR, with the checks reviews kept asking for.

- One question per lesson, answered in its heading and the line under it. Name a lesson by its topic, not a pun or a phrase.
- Two or three short paragraphs, then something to touch. Explore first, then answer.
- Every Estonian word in prose is a `Word` with a gloss.
- Listening only: nothing asks for the microphone.
- One idea per section. When a rule has two halves, such as -teist and -kümmend, give each half a section and its own explorer, then a section that puts them together.
- Don't give a section to something an explorer already shows. When one explorer holds every item, such as the seven days on one strip, its detail line explains each item: pressing a day says where its name comes from.
- Every lesson ends the same way: What to remember in three to five rules, then `LessonWords` on the stage's tray: a card with the first words as chips that opens to the full list, and under it, on the same tray, the way on to Lymi's free Estonian decks. Then the next lesson.
- English is the source; Ukrainian and Russian are transcreated, and a pronunciation tip compares a sound with the reader's own language where the match is accurate.
- A teacher checks the Estonian before a lesson launches.

## Practice parts

A lesson teaches with explorers and quizzes. The practice parts use the rule in context, after it is taught, and suit a later section of a lesson or a practice lesson of their own. `/components/lessons` shows each one working, and the explorers above it (`Paradigm`, `Scene`, `Timeline`, `Morph`, `FormMap` and its sheet), in English, Ukrainian and Russian.

| Use | When the lesson wants |
| --- | --- |
| `Listening` | Understanding by ear: a passage of four to eight sentences, two to four questions about what was said. Ask about meaning, never about a form the learner could spot without understanding. |
| `Listening` with `turns` | Anything with two or more speakers, or longer than about 30 seconds: from stage 2 on, in the lengths of [How hard each stage is](#how-hard-each-stage-is). Six to nine marks, in the order they are heard. |
| `Listening` with `plays` | A checkpoint or an exam paper, and the last listening part of a listening lesson. |
| `Reading` | The same check by eye, for a text a little longer or harder than a passage the learner could follow by ear. Give its words a glossary; they open only after Check. |
| `GapPassage` `pick` | One rule met gap by gap, such as olema's forms or a case ending: each gap has its own two to four words, and each mark explains the rule at once. |
| `GapPassage` `drag` | Several rules in one text, read as a whole: each gap's word depends on the sentence around it, and spare words stop the last gap from answering itself. |
| `Sort` | One rule that splits words into kinds: `-s` or `-l`, a total or a partial object, ma or da verbs. Each bin gets a `rule` in one line; a word the rule doesn't cover gets its own `why`. |
| `Match` | Pairs to tell apart at a glance: forms and meanings, question words and endings, verbs and their particles. Keep each side short; a long meaning wraps at 375 px. |
| `Quiz` with `OrderRound` | Word order: the verb second, a question word first, particle verbs, clauses. List every order a teacher accepts; build from `meaning` once the words are known, from sound before. |
| `Quiz` with `FormRound` | Making a form from a dictionary word: a case, a person, a stem change. Type it when the learner should produce the ending; give `options` when the point is telling close forms apart. |
| `Quiz` with `SentenceRound` | Making a whole sentence, after `FormRound` has made its forms. `dictation` when the ear is what is tested, `translate` for a meaning, `rewrite` for one change such as tense or no, `ask` for question words, `build` for putting dictionary words into their forms. One kind per quiz, or a mix in a drill. |
| `Quiz` with `FixRound` | Noticing a mistake learners make, then correcting it: an ending carried over from another verb, the wrong case after a number. Take the mistake from Harno's handbooks or EKI's grammar profile, never an invented one. |
| `Dialogue` | Phrases used in turn: greetings, questions and answers, saying no. Give the learner a role in one line, so a reply can be wrong for its meaning as well as its grammar. Use `text="sound"` once the phrases are familiar. |
| `Writing` | A practice lesson's own text: a message or a note that uses what the stage taught. Four or five checks, each one thing the text should do (greet, say where you live, use ei); the model meets every check. |

- Questions and wrong replies are in the reader's language; the passage, answers in gaps, and replies are Estonian.
- A question in `Listening` or `Reading` is one of four types, by its `kind`, and one part can mix them. No `kind` is a pick of three, with lettered answers. `truefalse` is a statement marked True or False. `short` is one or two words typed in Estonian: every form in `answers` counts, case, spaces and a full stop don't, and the first is shown when it was missed, so it is the words as the recording says them. `match` pairs each statement with a speaker or an item from `options`, and each statement is a mark of its own.
- Each question names the sentence that answers it (`line`), so a missed answer points back at the passage. A match names one per statement. In a conversation, sentences are counted from 0 across all turns.
- A passage and a dialogue use only what earlier lessons taught, plus at most a word or two the glossary explains.

## Drill banks

A lesson's bank in `components/learn/lessons/<File>.drills.ts` is data with no JSX: its rules and its items, typed in `apps/site/src/lib/learn/drill.ts`. `Osastav.drills.ts` and `PoodPoe.drills.ts` are the models.

- A rule has a short key, a label in the reader's language such as “The partitive after an amount”, and the `section` of the lesson that teaches it. A bank has at least three rules, four items on each, and 24 items in all, across more than one kind.
- An item has an `id` that never changes, because the visitor's schedule is kept under it, its `rule`, the clip it plays (`say`, in the words the clip says) and an `explain` line. Estonian inside an `explain` or a label is written `<et>pole</et>` and renders with `lang="et"`.
- Kinds are the quiz rounds: `form` (`FormRound`, typed, or picked when it has `wrong`), `choice` (`ChoiceRound`), `gap` (`GapRound`), the written ones `dictation`, `translate`, `rewrite`, `ask` and `build` (`SentenceRound`), and `fix` (`FixRound`). Most of a bank asks for whole sentences; a bare form is for the endings that need it. A new kind is one more member of `DrillItem`; the compiler then asks for its round in `DrillRound.tsx` and its Estonian and options in `drill-checks.test.ts`.
- A pick shows its answer and two wrong options drawn afresh each time, in a new order. `slip` on a `choice` is the likeliest mistake and is always offered.
- A bank uses only its lesson's clips and forms already in `verified-forms.json`.
- An id is renamed only when the question is a different one. Answers to an item that is gone are dropped the next time its bank loads.

A run (`drillReducer`) asks ten questions. A missed question waits for three others, or fewer when fewer are left. Among the questions free to ask, the run never takes the same rule twice in a row while another rule is free. A missed question leaves the run once it is right twice; it is asked twice in a row only when it is the last one left. A set takes what is due first, then what the learner has not met, then what they met longest ago.

A run on the server would differ from the browser's, so nothing of it renders there: a drill is a Start button until it is pressed.

## What comes back, and when

`apps/site/src/lib/learn/review.ts` keeps one entry per answered item in `localStorage`: how many right answers in a row it has, the day it is due and the day it was last answered. It is not Lymi's scheduler and never reaches Lymi's product, database or API.

- The first answer in a run counts. A miss is due the next day, from any point.
- A right answer is due again after 1 day, then 3, 7 and 21. Right after the 21 days, the item rests: it is no longer due, and a later miss in a drill brings it back.
- A right answer before an item's day leaves its day as it is, so drilling ten times in an evening is not ten steps.
- Days are the visitor's own, from midnight.
- A stored value of another version or shape reads as nothing, a broken entry is dropped alone, and the store keeps 3,000 entries, giving up rested ones first. Without storage it works until the page closes. `browser-store.ts` holds that for progress and review alike.

Only a bank's questions come back. A lesson's own quizzes teach and are not scheduled.

**Warm-up.** It offers what is due in earlier lessons, misses first, then what was answered longest ago, and nothing answered today. A miss is not asked again in it. It renders to nothing on the server. After hydration the offer takes empty space beside All lessons, so nothing moves; the card opens under the heading only when the learner asks, and Skip closes it.

**Review.** `/estonian/learn/review` asks everything due across lessons, ten at a time. The hub links to it with the number due, after hydration and only when there is one. It says when the next questions are due and nothing about missed days.
## Marking a written sentence

`markAnswer` in `apps/site/src/lib/learn/answers.ts` compares what was typed with every accepted sentence and keeps the closest. Case, spaces, commas, the mark at the end and the kind of quote, apostrophe or dash don't count; word order does. The result is one of three:

| Result | When | Score |
| --- | --- | --- |
| Right | Every word matches | Right |
| Nearly right | One or two words differ, each only in õ ä ö ü š ž marks or in one letter written single or double | Right, with a ring instead of a full dot, a line under the score and its own chip. The correction shows at once. |
| Not right | Anything else | Wrong |

Marks and length change meaning in Estonian, as lina and linna do, so a word that is itself a form is never a spelling slip. `near-forms.json` holds the course's forms that are one slip from another, written from `verified-forms.json` by `lesson:forms`, which keeps the browser from loading the whole list. An item adds its own words, and `confusable` names a form the course doesn't hold yet, such as tool beside tööl; `lesson:forms` then checks it and it counts in every lesson.

## Sound

Every clip a lesson plays is listed in `apps/site/src/lib/learn/clips.ts`. `pnpm --filter @lymi/site lesson:audio` records what is new or changed into `apps/site/public/audio/estonian-lessons/<lesson>/`, at 64 kbps, and removes clips no lesson uses. `manifest.json` beside them holds each clip's text, model and voice.

There are four voices. The product itself has only the first; the others are native Estonian speakers from ElevenLabs' library, listed in `LIBRARY_VOICES` in `lib/learn/recording.ts`.

| Voice | Who | Use it for |
| --- | --- | --- |
| `main` | Priit, a man: the product's Estonian voice (`et` in `speech-voices.ts`) | Words, sentences, the learner's side of a dialogue |
| `second` | Liis, a woman | The other speaker in a dialogue |
| `third` | Liisa, a woman | Friends, voice messages |
| `fourth` | Kalev, a man | News, announcements, exam instructions |

A clip is a word or sentence in the main voice; a line in a chosen voice; a passage, its `sentences` recorded as one take so it flows like speech; or a conversation, its `turns` each in a voice. For a passage the script also saves when each sentence starts, as `<clip>.json` beside the recording, from ElevenLabs' character timings.

A conversation is recorded by ElevenLabs' text-to-dialogue, all its turns together, so the voices answer each other; the response times every character and voice, and the script saves each sentence's start and speaker from it. Keep `eleven_v4`: `eleven_v3` said “No” for “Noh”. A turn's `text` is what the learner reads and what the checks compare. Its optional `say` is the same words with audio tags, such as `[curious]`, `[hesitates]` or `[laughs]`, which shape the delivery and are not spoken; `clipProblems` fails `clips.test.ts`, and stops a recording, when `say` without its tags isn’t `text`. Write a turn of several sentences as a list: a turn written as one string is one sentence to the player.

A conversation over 2,000 characters, tags included, is split between turns into several requests, joined with half a second between them. It is recorded again when a turn's words, tags, sentences or voice change, or the model. The 128 kbps original is never shipped: every recording is brought to the clips' loudness and 64 kbps. The raw responses stay in the git-ignored `apps/site/.lesson-audio/dialogue`, for looking into a timing that went wrong. A conversation can instead name one recorded clip per turn in `clips`, and is joined from them with nothing recorded; only the kit page's does, since text-to-dialogue sounds better. A `Dialogue`'s lines stay one text-to-speech clip each, because the learner answers between them.

`lesson:audio --dry-run` lists what would be recorded, joined and removed with its characters, and needs no key or ffmpeg. A run that would send more than 20,000 characters stops before it records; `--max-characters` raises that. `lesson:audio:check` sends clips to ElevenLabs' transcriber and writes `.lesson-audio/report.md`, the sentences that differ from their text worst first and single words apart, because single words transcribe badly. It compares words without case or punctuation and with numbers as digits, keeps each transcript in `.lesson-audio/transcripts.json` until the recording changes, and takes `--lesson <slug>`, `--limit <n>` and `--dry-run`. The script brings every new clip to the same loudness (−18 LUFS) with ffmpeg, so the two voices play at one level. It needs ffmpeg installed.

## Progress and analytics

`apps/site/src/lib/learn/progress.ts` keeps which lessons a visitor started and finished, and which sections of each, in `localStorage`. A reading section counts once its end has been on screen, so a short one may count as soon as the page opens; a section with a quiz counts when its quiz ends. `learn_quiz_finished` and `learn_lesson_finished` ([analytics](../analytics.md)) answer whether visitors finish lessons, which quizzes they get right and how many of the right answers had a slip in spelling, whether they come back to warm up and review, and which rules they miss.
