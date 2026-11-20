# Estonian lessons

Free, interactive Estonian grammar lessons at `lymi.app/estonian/learn`, in English, Ukrainian and Russian. Each lesson is an article with things to hear, try and answer dropped into it. They need no account and keep progress in the visitor's browser. They are a way into Lymi for people learning Estonian, and they stay on the public site.

## Launch

The lessons are built and reachable but not launched: `learn` is in `prelaunchPages` in `apps/site/src/lib/routes.ts`, so every lesson page and the hub send `noindex`, stay out of the sitemap, and no other page links to them. Launching is removing `learn` from that list, which also puts every lesson page in the sitemap (`routes.test.ts` checks both states), and linking the hub from the Estonian page and the footer.

## The course

`apps/site/src/lib/learn/catalogue.ts` lists every lesson in order, built or planned, in five stages from A1 to B1. The order follows Estonia's free courses and textbooks, checked in November 2026, with one change: sentences come first. After pronunciation, a learner says who they are, what they do and where they live, says no and asks, and only then learns numbers, the time and the days, so those words go straight into sentences they can already make. The place endings `-s` and `-l` and commands come early as phrases, a short lesson shows that stems change before the genitive needs it, and the verb's three forms come before the past tense. The rules that most learners trip on, consonant gradation and the total object, wait until the words are familiar. Each lesson has a plain `name` in the reader's language, the words people search for, such as Past tense or The partitive case, and a built lesson has a `title` for its heading and search result, such as Estonian pronunciation. Its `et` is an Estonian phrase from the lesson, shown small beside the name, never instead of it.

## Colour

Each surface means one thing, so a learner can tell from the surface alone whether they are reading, trying or being marked.

| Surface | Means | Used by |
| --- | --- | --- |
| Canvas | Reading | Prose, headings |
| Plate (white) | Answering. Right and wrong, green and red, appear only here | Quizzes, lists to hear |
| Tray, in the stage's hue | Exploring, with nothing to get wrong | Keys, chips, the number builder, comparisons, What to remember |
| Amber | The one next step in view | Start, Check, Next |

Each stage has a hue (`hue` in the catalogue). A lesson sets it as `--h` on `.learn`, and `learn.css` derives the tray and the lesson's ink from it. Inside a quiz the hue marks only what the learner acts on: Listen, the chosen chip, the band behind the quiz's title. The quiz's round dots sit on a white pill so green and red never land on the hue.

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
| `Quiz` with `ChoiceRound`, `GapRound` or `TypedRound` | Anything that marks the learner. A white card with its title on the stage's band, one Listen per round, the answers, a line of feedback, Next, and a score with Try again. The score lists the run's words as chips to hear again, misses marked, with a sparkle for a full score; give the quiz `recall` so it knows each round's word. A `TypedRound` item can bring its own `matches` and `prompt` when its answers can be typed many ways, as times are. A round can't be answered before its sound has played, except a `GapRound` with `listen="after"`, for a gap the sound would give away: the learner picks first and hears the sentence with the answer. Answers in a `ChoiceRound` share a row and grow alike, and a long one takes the room it needs, so labels fit in every locale. One flow drives every quiz: `quizReducer` in `apps/site/src/lib/learn/quiz.ts`. |
| `Listening` | Listen to a short passage, then answer. One recording plays as a strip of sound bars, a group per sentence: a tap on a group starts that sentence, and arrow keys step between them. Every question shows at once with lettered answers, and one Check marks them all. The text appears after Check, with the sentences behind missed answers underlined. A pick before the passage has played asks the learner to listen first. |
| `Reading` | Read a short text, then answer. The text sits on the canvas, with an optional recording under it that highlights the sentence it reads. The questions are the same as `Listening`'s. Its glossary words open their cards only after Check, so a card can't give an answer away. |
| `GapPassage` with `mode="pick"` | A passage with gaps, filled one at a time. The open gap's words sit under the passage, and each gap is marked as it is filled, with the rule behind it. Nothing plays while the learner works; the whole passage can be heard at the end. |
| `GapPassage` with `mode="drag"` | A passage with gaps and one bank of words, some of them `spare`. The learner drags words into gaps, out of them and between them, or taps a word to put it in the open gap. A keyboard places a word with Enter. One Check marks every gap, and a wrong word is struck through beside the right one. |
| `Dialogue` | Practise a conversation. The other speaker talks in the second voice, and at each of the learner's turns they pick a reply in Estonian. A wrong pick says why, then Say it plays the right reply and the conversation goes on. There are no translations. With `text="sound"` the other speaker's lines arrive as sound only, each readable on request. |
| `QuizCard`, `ResultDots` | The card and round dots every marked part shares, for a new kind of practice. |

A lesson file in `components/learn/lessons` holds its glossary, its sections and its recap, and passes them to `LessonView`, which draws a link back to all lessons, the head, the read bar, What to remember, the words, and links to the previous and next lessons, the same size. The read bar shows where the reader is, filling in order up to the section on screen; which sections are done is kept for the hub, not shown in the bar.

## Writing a lesson

- One question per lesson, answered in its heading and the line under it. Name a lesson by its topic, not a pun or a phrase.
- Two or three short paragraphs, then something to touch. Explore first, then answer.
- Every Estonian word in prose is a `Word` with a gloss.
- Listening only: nothing asks for the microphone.
- One idea per section. When a rule has two halves, such as -teist and -kümmend, give each half a section and its own explorer, then a section that puts them together.
- Every lesson ends the same way: What to remember in three to five rules, then `LessonWords` on the stage's tray: a card with the first words as chips that opens to the full list, and under it, on the same tray, the way on to Lymi's free Estonian decks. Then the next lesson.
- English is the source; Ukrainian and Russian are transcreated, and a pronunciation tip compares a sound with the reader's own language where the match is accurate.
- A teacher checks the Estonian before a lesson launches.

## Practice parts

A lesson teaches with explorers and quizzes. The practice parts use the rule in context, after it is taught, and suit a later section of a lesson or a practice lesson of their own. `/components/lessons` shows each one working, in English, Ukrainian and Russian.

| Use | When the lesson wants |
| --- | --- |
| `Listening` | Understanding by ear: a passage of four to eight sentences, two to four questions about what was said. Ask about meaning, never about a form the learner could spot without understanding. |
| `Reading` | The same check by eye, for a text a little longer or harder than a passage the learner could follow by ear. Give its words a glossary; they open only after Check. |
| `GapPassage` `pick` | One rule met gap by gap, such as olema's forms or a case ending: each gap has its own two to four words, and each mark explains the rule at once. |
| `GapPassage` `drag` | Several rules in one text, read as a whole: each gap's word depends on the sentence around it, and spare words stop the last gap from answering itself. |
| `Dialogue` | Phrases used in turn: greetings, questions and answers, saying no. Give the learner a role in one line, so a reply can be wrong for its meaning as well as its grammar. Use `text="sound"` once the phrases are familiar. |

- Questions and wrong replies are in the reader's language; the passage, answers in gaps, and replies are Estonian.
- Each question names the sentence that answers it (`line`), so a missed answer points back at the passage.
- A passage and a dialogue use only what earlier lessons taught, plus at most a word or two the glossary explains.

## Sound

Every clip a lesson plays is listed in `apps/site/src/lib/learn/clips.ts`. `pnpm --filter @lymi/site lesson:audio` records what is new or changed into `apps/site/public/audio/estonian-lessons/<lesson>/`, at 64 kbps, and removes clips no lesson uses. `manifest.json` beside them holds each clip's text, model and voice.

A clip is a word or sentence in the main voice, the product's Estonian voice (`et` in `speech-voices.ts`); a line in the `second` voice, for the other speaker in a dialogue; or a passage, its `sentences` recorded as one take so it flows like speech. For a passage the script also saves when each sentence starts, as `<clip>.json` beside the recording, from ElevenLabs' character timings. The second voice is Liis, a voice from ElevenLabs' library made from a native Estonian speaker; the product itself has no second Estonian voice. The script brings every new clip to the same loudness (−18 LUFS) with ffmpeg, so the two voices play at one level. It needs ffmpeg installed.

## Progress and analytics

`apps/site/src/lib/learn/progress.ts` keeps which lessons a visitor started and finished, and which sections of each, in `localStorage`. A reading section counts once its end has been on screen, so a short one may count as soon as the page opens; a section with a quiz counts when its quiz ends. `learn_quiz_finished` and `learn_lesson_finished` ([analytics](../analytics.md)) answer whether visitors finish lessons and which quizzes they get right.
