# The changelog

The changelog at `lymi.app/changelog` tells learners what changed in Lymi and what they get from it. Every update is on the list, newest first, and on a page of its own at `/changelog/<update>`, in English, Ukrainian and Russian. An RSS feed per language sits at `/changelog/rss.xml`.

## An update

An update is one folder in `apps/site/src/content/changelog`, named `YYYY-MM-DD-slug`, holding `en.md`, `uk.md` and `ru.md`. The date is the folder's; the slug names the update's page and never changes once published. Each file has a `title`, a one-sentence `summary`, an optional picture and the text. `changelog.test.ts` fails when a language is missing or its headings and list items differ from the English.

The summary stands on its own: it is the page description, the feed item and, once the product shows updates, the notice a learner reads there. The text leads with the change that matters most, gives each further change of its size a `##` heading, and ends with smaller changes under `### Fixes and improvements`.

## Writing

[The changelog skill](../../.agents/skills/changelog/SKILL.md) decides what goes in and holds the plain-language rules every sentence meets.

Spread updates out: one a day at most, so a day that shipped a lot becomes two or three updates on that day and the days after it. Never date an update before everything in it was live.

The Ukrainian and Russian files are transcreated from the English with the [translate skill](../../.agents/skills/translate/SKILL.md), as site copy is, and the pull request diff is their review.

## Pictures

Every update shows one picture, in a 16:10 tray in one of the eight Explore hues, stepped from the oldest update so neighbours differ and a new update repaints nothing. Every picture has the same shape, so the list keeps one rhythm and any picture can stand in for the update elsewhere. A figure is scaled down to fit its tray; a screenshot is placed by percentages, so it crops the same on a phone as on a desktop. Choose, in order:

1. **A screenshot**, only when the screen itself impresses or explains: a redesigned screen, or one part of a screen that shows the change at a glance. A screen that is mostly empty, or that needs the text to make sense, is not one.
2. **A figure**, for everything else: a landing demo or a drawing made for the update, listed in `changelog-figures.ts` and drawn by `ChangelogFigure` at 460 px wide. A drawing uses the product's own components and words, shows one moment, and leaves out anything the update does not mention.

### Screenshots

A screenshot is taken from the running product by a script, never by hand, so every language and both themes come out the same. The recipe is `screenshot.capture` in `en.md`:

```yaml
screenshot:
  frame: window # or phone, or panel
  alt: Insights on a computer, with a grid of days shaded by how much of each day’s goal was reached.
  capture:
    persona: learner # docs/local-dev.md lists them
    path: /insights
    prepare: # optional /api/dev routes, called in order
      - route: /api/dev/cards
        body: { count: 5 }
    keys: [Space, h] # optional keys pressed after the page loads
    theme: dark # optional, for a change only one theme shows
```

With the product running (`pnpm --filter @lymi/web dev --port 5241`), `pnpm --filter @lymi/site changelog:screenshots <folder>` reseeds the persona, sets the app language and theme, and writes `<locale>-light.webp` and `<locale>-dark.webp` beside the files. The page shows the one that matches the reader's language and theme. `uk.md` and `ru.md` repeat `frame` and translate `alt`, without `capture`.

A good screenshot:

- **Shows one change at work.** The state the text describes, with real-looking content from a persona: never empty, loading or mid-animation, and never a real account.
- **Is framed by the page, not the browser.** No browser chrome, device bezel, cursor, developer tools or drop shadow. `window` is the app at 1280 px wide, starting in from the tray's top-start corner and cut by its end and foot, so put the change in the window's top-start. `phone` is a 393 px screen standing in the tray's middle, cut by its foot. `panel` is one part of a screen, taken exactly by its `element` selector and shown whole: choose an element with padding of its own, such as a plate or a dialog.
- **Has nothing the text does not mention.** Close toasts and menus unless they are the change, and pick a persona and path that keep the screen quiet.
- **Says what it shows** in `alt`, in each language, as a sentence about the screen rather than the feature.
- **Is taken once.** The screenshot records the update as it shipped; a later redesign does not retake it.
