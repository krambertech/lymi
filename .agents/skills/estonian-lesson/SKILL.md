---
name: estonian-lesson
description: Build one Estonian grammar lesson at lymi.app/estonian/learn end to end, from choosing its content to an open PR. Use when asked to write, add or build a lesson in the Estonian course, or to fix a lesson's review findings or merge conflicts.
---

# Build an Estonian lesson

[The design doc](../../../docs/design/estonian-lessons.md) owns the course order, colour, the kit parts and the lesson rules. Read it first, then the two most recent lesson files in `apps/site/src/components/learn/lessons/`: copy their structure rather than inventing one. [The checklists](references/checklists.md) hold the long lists each step points to.

Work on a branch from a fresh `origin/main`, one lesson per PR. When the session that started you names a shared notes folder, read the sibling lessons' notes there first and leave yours there when you open the PR: which shared exports you added, kit edits, and gotchas.

## 1. Choose the content

Find the lesson in `apps/site/src/lib/learn/catalogue.ts`. Everything before it is what the learner knows; everything after it is off limits.

- List the words and grammar of every earlier lesson from their glossaries and the shared data in `apps/site/src/lib/learn/clips.ts`, such as `PRESENT_VERBS` and `PRESENT_ENDINGS`. Import that data instead of retyping it.
- The course is sentences first. Build examples from the verbs, pronouns and phrases earlier lessons taught, and put the new idea into those sentences.
- Answer one question in the heading and the line under it. Split it into sections with one idea each, then a section that puts the halves together.
- Each section is two or three short paragraphs, then something to explore, then something to answer.

Done when you have a section list where every Estonian word is either from an earlier lesson or is this lesson's new material, and each section names its explorer and its quiz. A word outside both needs a reason in the PR.

## 2. Check every Estonian form

Look up every form you will show or record before anything is recorded. ÕS 2025 is the norm since 1 January 2026, and Sõnaveeb's EKI dictionary carries it: `https://sonaveeb.ee/search/unif/est/eki/<word>` answers `curl`. The ÕS 2018 archive (`https://arhiiv.eki.ee/dict/qs/index.cgi?Q=<word>&F=M`) is a fallback only; recheck in Sõnaveeb any form where the two differ. A claim about where a word comes from needs EKI's etymology dictionary; without one, write "sounds like", never "comes from". [The Estonian slips](references/checklists.md#estonian-slips-reviews-caught) list what reviews caught before.

Then run `pnpm --filter @lymi/site lesson:forms` once the lesson renders: it lists every Estonian word the lesson shows or says that `apps/site/src/lib/learn/verified-forms.json` lacks, adds the ones Sõnaveeb confirms, and prints the rest. Fix each printed word, or add it by hand as `"<form>": "by hand: <source>"` when a source you can name confirms it, such as a name.

Done when every form and claim has a source you can name in the PR's Verification section, and `lesson:forms` adds nothing.

## 3. Add the catalogue entry and the page

Fill the planned entry in place in `catalogue.ts`; never add a second one.

- `slug`: the topic's Estonian word in ASCII, such as `eitus` or `kusimused`. It is the path and the clip folder.
- `name`: keep it plain and searchable, such as Negation. `et`: keep the Estonian phrase.
- `title`: the heading and search title, with "Estonian" in it or the phrase people search, such as "Estonian present tense" or "How to say no in Estonian".
- `minutes`, and `blurb`: one sentence for search that names what the lesson covers and ends "Every sentence is read aloud." when it is.

The lesson's file is its slug in PascalCase, and exports `<File>Lesson`; the page finds it by that name. Refer to another lesson's number through `lessonBySlug(slug)` when it is built; look a planned one up by its `et`, and check the number renders.

## 4. Write the lesson

One file in `components/learn/lessons/` with a `SLUG` constant, its glossary, its sections and its recap, passed to `LessonView`.

- Every Estonian word in prose is a `<Word>` with a gloss; any other Estonian (a `<b>`, a note, a recap line) carries `lang="et"`.
- Pick each part with [the kit tree](references/checklists.md#which-kit-part); check the design doc's tables before writing markup of your own.
- Write every line to [the copy rules](references/copy.md) as you go; step 5 checks them.
- Write every quiz to [the quiz rules](references/checklists.md#quizzes). Reviews flagged a giveaway or a skipped item in six of the first seven lesson PRs.
- End with What to remember in three to five rules, then the words.
- Write the lesson's drill bank, `<File>.drills.ts`, to [the bank checklist](references/checklists.md#drill-banks). `LessonView` adds the drill, and later lessons' warm-ups and the review page pick it up.
- Fix a kit part in its own file in `components/learn`, never in a copy inside the lesson, and name the fix in the PR and the notes: every lesson uses it.
- Each `Quiz` gets a fixed `id` of lowercase letters, digits and hyphens, unique in the lesson: it is the `quiz` property of `learn_quiz_finished`.

## 5. Edit the English

The copy is the lesson. A learner forgives a plain layout; a line that sounds machine-written tells them nobody checked the Estonian either. Hold every string to [the copy rules](references/copy.md): headings, prose, instructions, glosses, notes, quiz titles, feedback, verdicts, the recap and the blurb.

1. Read the lesson's strings in page order, aloud, as the learner meets them. Rewrite every sentence that does not teach a fact, show an example or say what to do next.
2. Run [the tell scan](references/copy.md#the-tell-scan) on the lesson file and give each hit a reason to stay or rewrite it.
3. Check every claim about the learner, difficulty or what people say against the lesson itself. Keep the reason, drop the claim.

Done when every string passes the copy rules and the scan has no hit without a reason.

## 6. Record the sound

List every clip in `clips.ts`: the lesson's shared data as exports, and an entry under its slug in `CLIPS`. Then record:

```bash
env PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc)/bin:$PATH" ELEVENLABS_API_KEY="$(sed -n 's/^ELEVENLABS_API_KEY=//p' "$(git rev-parse --path-format=absolute --git-common-dir)/../apps/web/.dev.vars")" pnpm --filter @lymi/site lesson:audio
```

Run it from the repository root, where `.nvmrc` names the Node it needs. The key goes from the main checkout's `apps/web/.dev.vars` into the command's environment only; never print it, echo it or write it to a file. The script records only new or changed clips, so a re-run is free. Done when it reports what you added and `pnpm --filter @lymi/site test` passes, since `clips.test.ts` checks the manifest against `CLIPS` and every mp3, and the lesson checks in `src/lib/learn/checks/` hold the lesson to the review rules the checklists mark **(checked)**. Each failure names the file, the rule and the fix; never add a new lesson to `known-issues.ts`.

## 7. Translate

English is the source. Run `pnpm i18n:extract` with the same Node, then fill every new Ukrainian and Russian entry with [the translate skill](../translate/SKILL.md#site-copy-is-transcreated): transcreate, ти and ты, never one language from the other. Each language meets [the copy rules](references/copy.md#ukrainian-and-russian) on its own terms. Give the title two or three candidates per language and list them in the PR.

Done when extract reports 0 missing in `uk` and `ru` and every new line reads as if a native teacher wrote it.

## 8. Get a cold copy review

Your own reading is anchored on what you meant. Give a subagent only the lesson file, its `uk.po` and `ru.po` in `apps/site/src/locales/learn/<File>/` and [the copy rules](references/copy.md), with no plan, notes or reasoning of yours, and ask it to list every English, Ukrainian and Russian line of this lesson that breaks a rule, each with its rewrite. Fix every finding or record in the PR why the line stays. Run it again on the fixed lines until a round finds nothing new.

## 9. Drive every section

Start the site with `npx astro dev --background --port <port>` from `apps/site`, which returns at once (`npx astro dev stop` stops it; plain `astro dev` holds the shell), and drive the lesson with Playwright at `/estonian/learn/<slug>`, `/uk/…` and `/ru/…`. The verify skill drives the web product, not the site, so it does not apply. Cover [the drive matrix](references/checklists.md#drive-matrix): every control and every quiz to its score, at 1280 and 375 px, light and night. Read each language's page top to bottom once as it renders: a line that was fine in the file can read wrong beside its controls.

Done when every state in the matrix is seen with no console error, no failed request and nothing past the right edge at 375 px. Then capture the screenshots the PR needs, as [the screenshot workflow](../open-pr/references/screenshots.md) says.

## 10. Open the PR

Run `pnpm verify:changed` after committing the `.po` files; it fails its catalog check while they are uncommitted. Then open the PR with [open-pr](../open-pr/SKILL.md) and turn on Auto-fix. Its body carries [the PR contents](references/checklists.md#pr-contents).

Merge main in when GitHub reports a conflict, and resolve it as [the conflict steps](references/checklists.md#merge-conflicts) say. Kateryna's standing instruction for lesson PRs: once approved, green and with no open threads, merge with `gh pr merge --squash`, never auto-merge.
