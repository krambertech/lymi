# Estonian lesson checklists

The lists [the estonian-lesson skill](../SKILL.md) points to. Most items come from review findings on the first lessons, #1210 to #1242.

Items marked **(checked)** fail `pnpm --filter @lymi/site test` when a lesson breaks them, with the file, the rule and the fix; [Estonian lesson checks](../../../../docs/testing.md#estonian-lesson-checks) says how. The rest still need a person.

## Which kit part

The design doc's Components and Practice parts tables describe each part. Walk this tree for each thing a section asks of the learner:

```
What does the learner do here?
├── Meet a word in prose → Word
├── Hear one clip → PlayButton or Listen; several → ListenRows
├── Explore, with nothing to get wrong → a Panel holding:
│   ├── a row of sounds, each explained → Keys
│   ├── one of a few choices that changes what is shown → Chips
│   ├── two words' length side by side → Compare
│   ├── a word's forms in a table: cases, persons, tenses → Paradigm
│   ├── where something is or goes, in a picture → Scene
│   ├── when, across tenses, and how each is built → Timeline
│   └── how a stem changes from form to form → Morph
├── Read a skippable exception or comparison → Aside
├── Get marked on the new rule → Quiz with:
│   ├── hear, then pick a word or form → ChoiceRound
│   ├── hear, then tap the place in a picture → SceneRound
│   ├── fill a gap in a sentence heard
│   │   ├── the sound does not say the answer → GapRound
│   │   └── the sound says it → GapRound listen="after"
│   ├── type what was heard, such as numbers or times → TypedRound
│   ├── make a form from a word and a cue (case, person, stem) → FormRound; options to pick
│   └── put words of a sentence in order → OrderRound; meaning once the words are known
└── Use the rule in context, once it is taught
    ├── understand a passage by ear → Listening
    ├── the same by eye, for a longer text → Reading
    ├── one rule, gap by gap → GapPassage mode="pick"
    ├── several rules in one text → GapPassage mode="drag"
    ├── phrases in turn → Dialogue; text="sound" once they are familiar
    ├── split words into two or three kinds by a rule → Sort
    └── pair forms with meanings, or question words with endings → Match
```

At 375 px a `GapRound` sentence of 12 characters fits and 14 does not, and its answers wrap 3+1 when there are four. Count the longest wrong pick, not only the answer: negation chose a `ChoiceRound` because "Nad ei armastavad" ran past the card.

## Quizzes

- **(checked) Every item comes up before any repeats.** Give each item `pair: [key, id]`, keyed on what the quiz tests (the ending, the pronoun, the question word), pass `order={eachPairFirst}`, and set `rounds` to the number of keys. Keyed on the wrong thing, a run of six heard all six endings once in a hundred. Fewer rounds than keys always leaves a key out, even when every item is its own key (six rounds for nine verbs). Add a test that `eachPairFirst(items).slice(0, rounds)` covers every key, as `olevik.test.ts` does.
- **(checked) The options never give the answer away.** The check runs each quiz's order 300 times: the answer must land in every place, and an answer's options must not always be the same set. A learner who stops listening must score at chance. Draw the wrong options at random from the rest, shuffle them after the page loads, and keep the first round as the server rendered it (`threeEndings` in `Olevik.tsx`). Reviews caught answers identified by a fixed set of options, a fixed position, the middle of three neighbours, and the shape of the text, where the answer was a prefix of a wrong one. Add the likeliest slip as a wrong option, such as today in "Which day is tomorrow?". Test that the answer lands in every position.
- **(checked) No option is another plus a letter or two.** Offered kool, kooli and koolis, a learner picks the middle one and is right without hearing it (#1248). This holds for `ChoiceRound`, `GapRound`, a lesson's own pick rounds and `GapPassage` in `pick` mode. Show the cue outside the options, such as kool above the choices and the endings as the options. Where telling two such forms apart is the point, as Ma ei õpi against Ma ei õpin, list the quiz in `ALLOWED_NEAR_PAIRS` in `checks/allowed-quizzes.ts` with the reason.
- **(checked) The answer's place gives nothing away, round by round.** The check runs each quiz 200 times as the page opens, its first round pinned to the server's, and 200 times after Try again. In every round after the pinned one, the answer must land in every place and no place may take more than twice its share (three in four with two options). A fixed option order under `eachPairFirst` made each round's answer the place no earlier round used (#1249). Shuffle each round's options in the order function after the first round (`heardRun` in `Kaskiv.tsx`).
- **(checked) A learner who doesn't listen scores at chance.** Over the simulated runs of each quiz with three options or more, a gap passage's gaps, a dialogue's replies and a listening or reading part's questions, "pick the longest", "pick the shortest", "pick the middle length", "pick the one with no one-letter neighbour", "pick the one sharing the most leading letters with a word heard", "pick the one sharing the most words with the others" and "pick the one sharing the most letters at its ends with the others" each score at most chance plus 25 points, in English, Ukrainian and Russian alike. A dialogue or question set needs three such rounds to count. When each wrong reply changes one thing about the right one, as Ma ostsid and Ma ostan beside Ma ostsin, the right one is the option most like the rest (#1257, #1259, #1261); add a wrong option that changes both, or wrong options that change different words. Answers that are always the longest give a passage's questions away in the same way (#1259). Loete among lugete and lugege is the only option without a one-letter neighbour, so it gives itself away (#1249). Hearing poes, pood is the only option that starts po-, so no one needs the stem rule (#1245). The leading-letters rule skips rounds whose clip says the answer as written, where matching what is heard is the task. Where a rule is the lesson, as the form without its ending after ei, list the quiz in `ALLOWED_STRATEGIES` in `checks/allowed-quizzes.ts` with the reason.
- **(checked) A gap passage's answers move between places.** No place holds two-thirds or more of a `pick` passage's answers, unless an even split can't do better, as two of three gaps with two options.
- **(checked) Nothing random or dated renders on the server.** Show a placeholder until the browser knows the value, or the page flashes Monday before today.
- **Give the quiz `recall`** so its score lists the words to hear again.
- **Typed answers accept every reasonable spelling,** such as `3,50 €`, `€3.50` and `5-2-0-9-4`, with cases in `quiz.test.ts`.
- **(checked) Each quiz, gap passage, dialogue, listening and reading part has a fixed id** of lowercase letters, digits and hyphens, unique in the lesson.
- **Feedback and notes hold in every case.** "After a number, minut becomes minutit" is wrong after üks; it says "from two up".

## Accessibility

- (checked) Mark every piece of Estonian outside a `Word` with `lang="et"`: a `<b>`, an ending such as `-n`, a recap line, a feedback line. The check finds a bold Estonian word in English, and any Estonian word on the Ukrainian and Russian pages; bare Estonian in English prose it can't tell from English, so write `<b lang="et">ei</b>` there.
- (checked) Let a button's visible text name it. An `aria-label="Play …"` replaces the text, so screen readers lose the meaning shown under the Estonian. A `ListenRows` row takes a `label` only when its text can't be read as it stands, such as syllables.
- Turn `aria-live` on only after the learner acts, and key its node so a change of verb does not re-read the same note.

## Estonian slips reviews caught

Each one reached a PR. Look for its kind in yours.

- (checked) A form that does not exist: "vanna" for vanni, in a length pair. Every Estonian word a lesson shows or says must be in `apps/site/src/lib/learn/verified-forms.json`; `pnpm --filter @lymi/site lesson:forms` adds what Sõnaveeb confirms. Sõnaveeb confirms that a form exists, not that it fits the sentence, so the rest of this list still needs you.
- An origin without a source: aitäh is not borrowed; it comes from *aita jumal*.
- English that does not match the Estonian: "aasta pärast" in a description that said "in a week".
- A gloss missing a meaning: `te` and `olete` are also the polite "you" to one person.
- (checked) A form glossed twice: a glossary built from a list keeps only the last entry for a key, so tema as he or she was lost under tema as his or her (#1248). Give the form one entry with both meanings.
- A rule stated wider than it holds: minut after üks; 25 past said to need cases that 20 already uses. Reasons in comments must be true too.
- A teaching claim the literature contradicts: intonation alone does not make a neutral yes-or-no question; `kas` questions fall like statements.
- (checked) Case at the start of a sentence: `Word` shows `w` as typed, so a sentence start needs `<Word w="Homme" />`. Day names are lower case anywhere else, in the uk and ru lines too.
- (checked) A clip only a press reaches: a chip that plays its verb, or a table the chip fills, played clips nobody recorded (#1259). The check presses every chip and renders the page once per chip value; every clip it reaches must be in `CLIPS` and the manifest.
- (checked) Text and sound that drift apart: a gap passage, a listening or reading part, or a dialogue line whose shown text isn't its clip's, and a passage sentence without its full stop (#1241, #1242).
- (checked) Another lesson found by its `et` label: a built lesson is found with `lessonBySlug`, and a planned one by an `et` the catalogue holds (#1213, #1224).

A teacher checks the Estonian before launch. That is a second check, never a reason to leave a known error in.

## Drive matrix

Drive the lesson in Playwright at 1280 and 375 px, light and night (`colorScheme: "dark"`), in en, uk and ru.

- Every `Word` card, by resting on it and by tapping it.
- Every key, chip, switch, line and play button.
- Every quiz: the Listen-first nudge, right and wrong picks, Hear both, the score, and Try again.
- What to remember, the words card opened, and the links to the previous and next lessons.
- At 375 px, measure every element's right edge against the viewport. `scrollWidth` alone misses clipping inside an `overflow-hidden` card. No check does this yet: the site has no browser test of lessons.

For element screenshots, hide `astro-dev-toolbar` and make `.sticky` static, or the read bar lands on top. If `astro dev` logs "Invalid hook call" after many reloads, such as while `lesson:audio` writes into `public/`, stop and start it again.

## PR contents

- **Summary.** The path and title, what the lesson teaches, its explorers and quizzes, the number of new clips, and the catalogue change.
- **Screenshots.** Each section and each quiz at desktop light and phone night, plus uk and ru.
- **Instrumentation.** The product question: do visitors finish this lesson, and which quiz do they get wrong? The lesson reuses `learn_quiz_finished` with its quiz ids and `learn_lesson_finished`, both sent by the kit; name the ids. Change `docs/analytics.md` only for a new event or property.
- **Verification.** Each form and claim with its source; `pnpm --filter @lymi/site typecheck` and `test`; extract at 0 missing; `pnpm verify:changed`; the drive matrix with its count of states; `pnpm reliability`.
- **Copy.** The tell scan's remaining hits with their reasons, how many cold review rounds ran, and each line kept against a finding.
- **Judgement calls.** The title and its uk and ru candidates, what the lesson leaves out and why, and any word from outside earlier lessons.

## Merge conflicts

Lessons land in parallel, so a second lesson conflicts in the same shared files. Merge main in and keep both lessons:

1. `git fetch origin && git merge origin/main`.
2. `catalogue.ts`: keep main's order and every other lesson's filled fields. Your entry keeps its fields wherever main moved it, and no planned line for the same lesson is left behind.
3. `clips.ts`, `LESSON_VIEWS` and its imports, and `apps/site/public/audio/estonian-lessons/manifest.json`: keep both sides' entries.
4. The `.po` files: take main's version, run `pnpm i18n:extract`, then fill your lesson's uk and ru entries again from your side of the merge (`git show HEAD:apps/site/src/locales/uk.po`).
5. Run `lesson:audio`. It records nothing; a clip it records means a text changed, so find out which before going on.
6. Run the site's typecheck and tests, commit the merge and push.
