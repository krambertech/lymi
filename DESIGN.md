---
name: Lymi
description: A vocabulary app with a storm lantern. Two rooms, one flame. Warm, calm, quick.
colors:
  canvas: "#f8f6f4"
  rail: "#f2f0ec"
  plate: "#ffffff"
  plate-2: "#f2f0ec"
  hover: "#eeebe6"
  edge: "#2013081a"
  edge-2: "#20130833"
  image-edge: "#0000001a"
  text: "#1c140f"
  text-2: "#49403a"
  muted: "#72665f"
  faint: "#a59d96"
  amber: "#f8ac3d"
  amber-hover: "#ef9d32"
  amber-ink: "#331b06"
  amber-text: "#9f4500"
  amber-soft: "#f8ac3d29"
  amber-tint: "#f8ac3d42"
  amber-tint-ink: "#331b06"
  flame-core: "#fff4b7"
  glass: "#fae5c9"
  glass-unlit: "#f0ede9"
  metal: "#1c140f"
  glow: "#f8ac3d73"
  good: "#006e42"
  good-soft: "#006e421f"
  state-new: "#867f79"
  state-learning: "#4284c5"
  state-learning-soft: "#4284c524"
  state-learning-text: "#23588a"
  state-known: "#249057"
  danger: "#be241f"
  danger-soft: "#be241f1a"
  ai: "#733ea4"
  ai-soft: "#733ea41a"
  ring: "#20130899"
  scrim: "#1e130e59"
  shimmer: "#ffffff66"
  toast-action: "#fdb443"
  grade-forgot: "#be241f"
  grade-hard: "#72665f"
  grade-good: "#006e42"
  grade-easy: "#1c140f"
  dark-canvas: "#130d09"
  dark-rail: "#1a120e"
  dark-plate: "#201713"
  dark-plate-2: "#29211b"
  dark-hover: "#302720"
  dark-edge: "#ffffff14"
  dark-edge-2: "#ffffff26"
  dark-image-edge: "#ffffff1a"
  dark-text: "#f1eee7"
  dark-text-2: "#c5bcb1"
  dark-muted: "#a89c90"
  dark-faint: "#665c52"
  dark-amber: "#fdb443"
  dark-amber-hover: "#ffc250"
  dark-amber-ink: "#2b1401"
  dark-amber-text: "#f9bf60"
  dark-amber-soft: "#fdb44324"
  dark-amber-tint: "#fdb44329"
  dark-amber-tint-ink: "#f9bf60"
  dark-flame-core: "#fff4b7"
  dark-glass: "#432c17"
  dark-glass-unlit: "#271f19"
  dark-metal: "#f1eee7"
  dark-glow: "#f6ad3b80"
  dark-good: "#7bc495"
  dark-good-soft: "#7bc49524"
  dark-state-new: "#83786e"
  dark-state-learning: "#85b6e9"
  dark-state-learning-soft: "#85b6e924"
  dark-state-learning-text: "#a2c8f0"
  dark-state-known: "#7bc495"
  dark-danger: "#fb8274"
  dark-danger-soft: "#fb827424"
  dark-ai: "#cba9f3"
  dark-ai-soft: "#cba9f329"
  dark-ring: "#f1eee7b3"
  dark-scrim: "#0000008c"
  dark-shimmer: "#ffffff0f"
  dark-toast-action: "#9f4500"
  dark-grade-forgot: "#fb8274"
  dark-grade-hard: "#a89c90"
  dark-grade-good: "#7bc495"
  dark-grade-easy: "#f1eee7"
typography:
  word:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: "-0.03em"
  word-phone:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  hero:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  meaning:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.3
  subhead:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.4
  lede:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  kbd:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  2xl: "30px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
  button-secondary:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "40px"
  button-primary-xl:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
    height: "64px"
    padding: "0 20px"
  button-grade:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text-2}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.lg}"
    height: "72px"
  input:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  chip:
    backgroundColor: "{colors.plate-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-state:
    backgroundColor: "{colors.plate-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "26px"
  chip-source-badge:
    backgroundColor: "{colors.ai-soft}"
    textColor: "{colors.ai}"
    rounded: "{rounded.pill}"
    height: "17px"
    padding: "0 6px"
  due-count:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-tint-ink}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  card:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.xl}"
  deck-row:
    backgroundColor: "{colors.plate}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
---

# Lymi design system

Lymi is a vocabulary app lit by a storm lantern. The interface is two rooms, a dark one lit by that lantern and a light one at noon, and it follows the OS theme unless the learner picks one in Settings. Both rooms are flat and warm, and amber is the one colour that asks for a press. Three words: warm, calm, quick.

The frontmatter above is generated from `apps/web/src/client/styles.css` by `node scripts/check-design-docs.mjs --write`, and `pnpm check:design` fails when the two disagree. The live version is the `/design` route in local development: every token and component with the real code, each primitive in every state it has, desktop and touch frames side by side, and reduced motion behind a button on each canvas.

## Rules every screen follows

Each rule links to the file that holds its detail and its exceptions.

1. **Tokens, never values.** Colour through the semantic utilities (`bg-plate`, `text-muted`), type through the scale (`text-lg`), radius through `rounded-*`. A raw hex or a stock Tailwind colour breaks dark mode, which is its own warm palette rather than an inversion. [colour.md](docs/design/system/colour.md)
2. **Amber means act.** It is the flame, the one primary button, capture, a due count, a day reviewed, and the Easy grade's icon. Nothing else is amber, including a selected state. [colour.md](docs/design/system/colour.md#amber-means-act)
3. **Surfaces are flat.** Depth is one hairline edge. No drop shadows and no gradients; the only glow belongs to the lantern. [surfaces.md](docs/design/system/surfaces.md)
4. **One primary per view.** Two primaries means the screen has no hierarchy. `secondary` is the default variant. [buttons.md](docs/design/system/buttons.md)
5. **A closed set is closed.** Every variant, size and tone a component takes is listed in its file. An unlisted one is a bug, not an option, and a `className` that resizes or recolours a component is the same bug.
6. **Never `disabled` on a button that cannot run yet.** Forms stay pressable and validate on submit; `aria-disabled` is for mid-request. [buttons.md](docs/design/system/buttons.md#states)
7. **Undo replaces confirmation.** A question dialog is for what cannot be undone. [overlays.md](docs/design/system/overlays.md)
8. **Every screen is built with `Screen`**, carries one `h1`, and skips no heading level. [layout.md](docs/design/system/layout.md)
9. **Logical directions.** `ms-`, `pe-`, `start-`, `text-start`, never `ml-`, `pr-`, `left-`, `text-left`, so a right-to-left locale is a catalog and not a refactor.
10. **Status is never colour alone.** A state carries an icon and a word; an error carries an icon. [colour.md](docs/design/system/colour.md#status-is-never-colour-alone)
11. **Every control has** default, hover, focus, active, disabled and, where it applies, loading. Hover goes through `hoverable:` so touch never sticks.
12. **Motion conveys state**, leaves faster than it arrives, never animates a keyboard action, and has a reduced version. [motion.md](docs/design/system/motion.md)

## Where the rules live

Read the file for what you are building. Each is short enough to read whole.

| Building | Read |
| --- | --- |
| Anything: which component exists | [components.md](docs/design/system/components.md) |
| Colour, amber, card states, the AI badge | [colour.md](docs/design/system/colour.md) |
| Backgrounds, edges, radius, glow, the tray | [surfaces.md](docs/design/system/surfaces.md) |
| Type sizes, weights, monospace | [type.md](docs/design/system/type.md) |
| Buttons and links | [buttons.md](docs/design/system/buttons.md) |
| Forms and choice controls | [forms.md](docs/design/system/forms.md) |
| Dialogs, sheets, places, menus, tooltips, toasts | [overlays.md](docs/design/system/overlays.md) |
| Chips, state marks, due counts, keys | [chips-and-marks.md](docs/design/system/chips-and-marks.md) |
| Screens, navigation, Today, review | [layout.md](docs/design/system/layout.md) |
| Empty, loading and error states | [empty-states.md](docs/design/system/empty-states.md) |
| Timing, choreography, reduced motion | [motion.md](docs/design/system/motion.md) |
| The lantern, the flame, the wordmark, the app icon | [brand.md](docs/design/system/brand.md) |
| Words on the screen | [voice.md](docs/design/system/voice.md) |
| The `/docs` site | [docs-site.md](docs/design/system/docs-site.md) |

## Feature design

- [The streak](docs/design/streak.md)
- [Letting an app in](docs/design/connected-apps.md)
- [Insights](docs/design/insights.md)
- [Library, decks and cards](docs/design/library-decks-and-cards.md)
- [Review completion](docs/design/review-completion.md)
- [Imports and exports](docs/design/imports.md)
- [Activity](docs/design/activity.md)
- [Explore](docs/design/explore.md)
