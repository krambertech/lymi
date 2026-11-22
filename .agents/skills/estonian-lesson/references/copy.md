# Lesson copy

The rules every string in an Estonian lesson meets, in English, Ukrainian and Russian: headings, prose, instructions, glosses, notes, quiz titles, feedback, verdicts, What to remember and the blurb. [The voice rules](../../../../docs/design/system/voice.md) apply too: plain, friendly, one learner, nothing celebrated for them. The examples come from the shipped lessons.

## The bar

Each sentence does one of three jobs: it teaches a fact, it shows an example, or it tells the learner what to do next. A sentence doing none of them goes, however pleasant it sounds.

The model is a good teacher talking across a table: short sentences, the Estonian first, the rule named in plain words, and no performance.

> To say not, put ei before the verb. Ma loen is I read, and Ma ei loe is I don't read. The verb loses its ending, and ei is the same whoever you're talking about.

That paragraph names the mechanism, shows it on one verb, and states the consequence. Copy its shape.

## Write it this way

- **Example before rule.** The Estonian, its meaning, then the rule in one sentence. A rule with no example in the same paragraph is not finished.
- **Name the mechanism.** Say what goes where and what changes: "put ei before the verb and drop its ending". "Negation in Estonian is simple" teaches nothing.
- **One claim per sentence.** Keep sentences under about 20 words and paragraphs to two or three sentences.
- **Give the reason, not a claim about people.** "This is the one most learners get wrong at first" cannot be sourced. "Pool looks ahead, so pool neli is 3:30, not 4:30" says why the mistake happens. Write that instead, or nothing.
- **Say why something is easy or hard, or say nothing about it.** "Yes has six endings to learn, and no has none" earns "the easy half". "Estonian is a hard language" earns nothing.
- **Instructions name the action and its result.** "Tap a line to hear it." Say tap, which reads right with a mouse too. Give no instruction a phone cannot follow: "Press Enter to check" fails on a phone, and the Check button already says it.
- **Feedback and verdicts report, they never praise.** Say what the score means and what to replay: "Play the ones you missed once more." "Good ear." adds nothing; the shipped lessons used it five times. A verdict claims only what the quiz tested: six rounds of endings do not show that the learner "can build any verb".
- **One name per idea, across the course.** Reuse the earlier lesson's term: the ma form, the stem, the ending, the partitive. Use a grammar term only when this lesson teaches it or links the lesson that does, and explain it on first use.
- **Literal translations are marked.** "Word for word: “what clock is?”" Curly quotes and the ellipsis character, as the voice rules say.
- **A sentence starts with a capital.** "pool means half" starts with a lowercase letter on the page. Give the `Word` a capitalised `w` (`<Word w="Pool" />`), or reorder the sentence so the Estonian is not first.
- **Glosses are short and plain.** "to read", "I don't read", "don't speak, doesn't speak". Keep one rendering of a pronoun across lessons: ta is "he or she", te is "you, to more than one; polite you".
- **Cross-references say what the other lesson holds.** "lesson {genitive} explains the form", not a bare "see lesson 12".
- **Headings name the topic.** Sentence case, no puns, no questions the heading itself does not answer.
- **The blurb lists what is in the lesson** in the words people search for, then "Every sentence is read aloud." when that is true.

## Machine tells

These mark a line as written by a machine. Each needs a rewrite, not a softer synonym.

- Praise and cheer: good ear, great, well done, nice, awesome, perfect, amazing, you've got this, an exclamation mark in prose.
- Hype verbs and metaphors: master, unlock, dive in, journey, the secret, the magic, tricky, a breeze.
- Filler adverbs: simply, actually, really, basically, essentially, just as a softener.
- Set-ups: "Let's", "Here's the thing", "In this lesson you will", "Ready?", a rhetorical question answered by the next sentence, "The trick? …".
- "Not just X, but Y", unless the "not" half corrects the real mix-up, as "3:30, not 4:30" does.
- Lists of three that exist for rhythm; use the number of things there are.
- A colon used as a drumroll before the point. A colon before an example or a list is fine.

## The tell scan

`copy-checks.test.ts` runs this scan, curly apostrophes and the Ukrainian and Russian scan below on each lesson file's catalog entries, so run `pnpm i18n:extract` before the tests. A hit that stays goes in `apps/site/src/lib/learn/checks/allowed-copy.ts` with its reason. By hand, from the repository root:

```bash
grep -nEi "good ear|great|well done|nice|awesome|amazing|perfect|let's|here's|simply|actually|really|basically|essentially|easy|tricky|master|unlock|journey|dive in|most learners|press enter|\bclick\b" apps/site/src/components/learn/lessons/<File>.tsx
```

Some hits stay: "Perfect tenses" is a lesson name, and "the easy half" follows its reason. The scan finds candidates; the rules above decide. It cannot see an exclamation mark in prose, so look for those yourself.

## Ukrainian and Russian

Each language meets the same bar on its own terms. Write each from the English, never one from the other, and read it cold as a native teacher would.

- **Transcreate the reasoning, not the sentence.** The time lesson's English claim about "most learners" became, in Ukrainian, a comparison the reader already knows: «Почуй годину й відступи на пів години назад, як у «пів на четверту»». Where the reader's language explains the Estonian better than the English did, use it, when the match is accurate.
- **Grammar terms as schools teach them.** uk закінчення, основа, відмінок, заперечення; ru окончание, основа, падеж, отрицание. Reuse the earlier lessons' translation of any message they share.
- **Ти and ты,** guillemets «», and no praise: «Хороший слух» is the same tell as "Good ear".
- **Officialese and calques.** ru является, осуществлять, данный, в рамках; uk являється, здійснювати, на протязі, слідуючий, приймати участь. Write the plain verb.
- **Calques reviews caught.** «змінюється з особою» became «залежить від особи»; «утворюються за чергуванням» became «змінюються через чергування приголосних», ru «меняются из-за чередования согласных».
- **Clipped references.** «про це урок {n}» became «про це розповідає урок {n}», ru «об этом — в уроке {n}».
- **A dash between two nouns.** «Тому <1/> — неправильне дієслово», «Ты — тот, кто говорит».
- **Pairs that match.** «Одна людина» and «Кілька людей», not «Множина».
- **Keep the English line's point.** «Перші чотири — з числами», not «по порядку».
- **No capital mid-sentence** in a feedback line, and check long answers such as «Понедельник» and «Воскресенье» at 375 px.
- **A short English message can already exist with another meaning,** as "Say it" did. Give yours a `context`.

The site tests scan this lesson's entries for officialese, praise and the calques above. By hand:

```bash
grep -nEi "явля|здійсн|осуществ|данн|в рамках|у рамках|на протязі|слідуюч|приймати участь|молодець|молодец|чудово|отлично|хороший слух|добрий слух" apps/site/src/locales/uk.po apps/site/src/locales/ru.po
```
