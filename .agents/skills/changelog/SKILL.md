---
name: changelog
description: Write, catch up or edit Lymi's public changelog at lymi.app/changelog. Use when asked to draft changelog updates for what merged, or to review an update's wording or picture.
---

# Write the changelog

[The changelog design](../../../docs/design/changelog.md) owns an update's files, structure, dates and pictures. This skill is the order you work in and the plain-language bar every sentence meets.

## Steps

1. **Find the gap.** Updates are dated ahead, so start from the day the newest update merged, not its folder's date: `git log origin/main -1 --format=%ad --date=short --diff-filter=A -- apps/site/src/content/changelog`. List what merged since with `git log origin/main --since=<that day> --format='%ad %h %s' --date=iso`, and read the pull request body of every `feat` and `fix` commit a learner might notice. A title can mislead: a change that says `deck` may reach only the phone. Search the existing updates before calling something unannounced. Done when every such commit is sorted by step 2.
2. **Sort each change.** Walk this tree for every commit:
   ```
   Can a learner use or see it today on the web or lymi.app?
   ├── No (phone app before the store, operators only, removed since, analytics, tooling, CI) → leave it out
   └── Yes
       ├── A new thing the learner can do → weigh it under Own update or folded in
       ├── A fix to something that went wrong → one line under ### Fixes and improvements
       ├── A new lymi.app page → one line under ### Fixes and improvements
       └── A look or motion tweak (light, glow, sizes, number rolls) → leave it out; it changes nothing the learner does
   ```
3. **Spread the updates** as [Writing](../../../docs/design/changelog.md#writing) says. A fix line goes with any update dated on or after its merge. When catching up, spread fix lines across the updates rather than filling the first one, and put each line with the closest subject. Date smaller updates in the past and the biggest ahead, so the biggest stays at the top of the list.
4. **Check the facts.** Before a sentence states a number, a default or a control name, find it in the code: labels in `apps/web/src/locales/en.po`, defaults in `packages/core`. A guess stated as fact is a bug in the changelog.
5. **Write the English.** Apply every rule under Plain language to every sentence. Done when the self-audit at the end of that section finds nothing.
6. **Draw the picture.** Every update has one, chosen as [Pictures](../../../docs/design/changelog.md#pictures) orders. A new figure is a component in `apps/site/src/components/changelog`, named in `changelog-figures.ts` and drawn in `ChangelogFigure.tsx`. Load the `impeccable` skill first, and copy the product's own labels and layout. A large launch needs more than a piece of the interface: draw something a reader recognises at a glance, like the MacBook for Lymi for Mac, as a scene. Build two to four running options and let Kateryna choose before finishing one. Examples of real language in a picture need the same native check as the text.
7. **Translate.** Write `uk.md` and `ru.md` from the English with [the translate skill](../translate/SKILL.md). The plain-language rules apply in every language. Run `pnpm i18n:extract` in `apps/site` and fill the figure's new strings.
8. **Check.** Run `pnpm --filter @lymi/site exec vitest run src/lib/changelog.test.ts`, then open `/changelog`, `/uk/changelog` and `/ru/changelog` on the site's dev server in light, dark and at 393 px. Done when the test passes and every picture fits its tray in all of them.

## Own update or folded in

Most changes do not earn an update. Ask what a learner would tell a friend, not how much work the change was.

| The change | Where it goes |
| --- | --- |
| A new place, language or way of working that someone would come to Lymi for: an app, a language, an import source, a change to every card | Its own update |
| A control or option on something that exists: a setting, a menu action, a new filter | A `##` section in the closest update, or its own short update only if nothing is close |
| A rename, a small button, a fix | One line under `### Fixes and improvements` |

- **Lead with what interests a reader.** When two changes share an update, the more interesting one is the title and the other is a section. Adaptive pronunciation is a section inside "Cantonese and Tamil cards", though it merged later.
- **Fold by subject.** A section goes where its reader already is: Select cards actions beside the deck filter, a pronunciation switch beside the languages it affects.
- **Do not pad for cadence.** Spreading gives a regular list, but an update needs a reason to exist on its own title and picture. If its title would interest only someone already using that control, fold it in.
- **A slug can change until the update is published.** Rename the folder when the lead changes.

When unsure, propose the sorted list and dates before writing three languages and drawing pictures.

## Plain language

The reader is a learner checking what changed. They want the fact and the control's name, then they leave. Write *plain*: the words a friend would use to tell them over a message.

**Start with the change.** The first sentence names what the learner can now do. Cut scene-setting.
- Before: "Some cards matter more than others: the phrase you need at the doctor’s on Friday."
- After: "Choose Mark important in a card’s menu."

**Say it literally.** A feature does what it does. Things don’t "sit", "land", "fill the room" or "do more than"; Lymi "shows", "adds", "imports".
- Before: "Tags now do more than sit on a card."
- After: "You can now filter a deck by tag."

**Use the app’s words.** Name screens and controls exactly as the interface does, and use [CONTEXT.md](../../../CONTEXT.md)’s terms. Quote no label the app doesn’t show. Pull request numbers, AI model and provider names and internal terms stay out.

**One fact per sentence, under 20 words.** Split at "and", a colon or a dash that joins two facts.
- Before: "Its sub-decks come with it: Verbs inside Spanish becomes Spanish / Verbs."
- After: "Each sub-deck becomes its own deck. Verbs inside Spanish becomes Spanish / Verbs."

**Short common words.** "Shows", not "draws". "Has", not "carries". "Imported", not "comes across". "Starts right away", not "starts at once without any loading state".

**State, don’t sell.** No adjectives that praise (beautiful, smooth, powerful, easily), no exclamation marks, no "even better". A reason stays only when it changes what the learner does.
- Before: "A longer gap is a better test of whether you remember it."
- After: delete it, or keep it only if the learner would act differently.

**Fix lines say the result.** Start with the thing the learner touches, then what it does now. Leave the cause out.
- Before: "If Lymi updates while a tab is open, the tab moves to the new version instead of failing on the next page."
- After: "An open tab reloads when Lymi updates, instead of showing an error."

**Titles and summaries are plain.** A title names the feature as a short command in sentence case: "Import from Noji", "Delete your account", "Mark important cards". No slogans or wordplay: "Mark the cards that matter" and "A larger light" say nothing a learner can act on. The summary is one sentence saying what the learner can do.

**Self-audit.** Read each sentence aloud and ask what a learner would picture. A picture that is a metaphor, a mood or a sales line means the sentence goes or gets rewritten as the fact behind it.
