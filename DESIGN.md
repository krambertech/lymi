---
name: Lymi
description: A flashcard app with warm light and dark themes, readable content and quick capture and review.
---

# Lymi design system

Lymi uses warm light and dark themes, clear typography and restrained motion. The app follows the OS theme unless the learner chooses one in Settings. Light surfaces use borders for separation; dark surfaces also use subtle elevation. Amber highlights primary actions and the specific states listed in [colour.md](docs/design/system/colour.md#amber-means-act).

Values live in one place: colours, type, radius and easing in `packages/design/tokens.css`, and component variants in each component's source. This file holds direction and points to the guide that owns each rule; `pnpm check:design` fails if tokens come back into its frontmatter. The `/design` site renders the real tokens and components, with each rule's do and don't, desktop and touch layouts, and a theme and reduced-motion switch on each canvas.

## Rules every screen follows

Each rule links to the file that holds its detail and its exceptions.

1. **Tokens, never values.** Colour through the semantic utilities (`bg-plate`, `text-ink-muted`), type through the scale (`text-lg`), radius through `rounded-*`. A raw hex or a stock Tailwind colour breaks dark mode, which is its own warm palette rather than an inversion. [colour.md](docs/design/system/colour.md)
2. **Use amber only for defined roles.** Primary actions, capture, due counts, review progress, important-card marks, selected checkboxes and switches, and native navigation have specific rules. Read the complete list before adding another use. [colour.md](docs/design/system/colour.md#amber-means-act)
3. **Use the surface utilities.** Light surfaces use a thin border; dark surfaces add elevation through `edge`. Use `well`, `lit` and `key-light` only for their documented roles. Group related panels with spacing and headings. [surfaces.md](docs/design/system/surfaces.md)
4. **One primary action per view.** Use `secondary`, the default variant, for other actions. A dialog has its own action hierarchy. [buttons.md](docs/design/system/buttons.md)
5. **Use the component’s supported API.** Variants, sizes and tones are defined in its source. Extend that API when needed rather than resizing or recolouring individual instances with `className`.
6. **Never `disabled` on a button that cannot run yet.** Forms stay pressable and validate on submit; `aria-disabled` is for mid-request. [buttons.md](docs/design/system/buttons.md#states)
7. **Undo replaces confirmation.** A question dialog is for what cannot be undone. [overlays.md](docs/design/system/overlays.md)
8. **Every screen is built with `Screen`**, carries one `h1`, and skips no heading level. [layout.md](docs/design/system/layout.md)
9. **Use logical directions.** Prefer `ms-`, `pe-`, `start-` and `text-start` so layouts support right-to-left languages without separate spacing rules.
10. **Status is never colour alone.** A state carries an icon and a word; an error carries an icon. [colour.md](docs/design/system/colour.md#status-is-never-colour-alone)
11. **Every control has** default, hover, focus, active, disabled and, where it applies, loading. Hover goes through `hoverable:` so touch never sticks.
12. **Motion conveys state**, leaves faster than it arrives, never animates a keyboard action, and has a reduced version. [motion.md](docs/design/system/motion.md)
13. **Share design across apps.** Web, site and phone use the same tokens, brand assets and motion presets. When changing shared behavior, describe its effect on each surface in the pull request or proposal. [phone.md](docs/design/system/phone.md)

## Where the rules live

Read the guide for the component or interaction you are changing.

| Building | Read |
| --- | --- |
| Anything: which component exists | [components.md](docs/design/system/components.md) |
| Colour, amber, card states, the AI badge | [colour.md](docs/design/system/colour.md) |
| Backgrounds, elevation and hover, edges, sets, radius, glow, the deck tray | [surfaces.md](docs/design/system/surfaces.md) |
| Type sizes, weights, script faces, readings, stress, text direction, monospace | [type.md](docs/design/system/type.md) |
| Buttons and links | [buttons.md](docs/design/system/buttons.md) |
| Forms and choice controls | [forms.md](docs/design/system/forms.md) |
| Dialogs, sheets, places, menus, tooltips, toasts | [overlays.md](docs/design/system/overlays.md) |
| Chips, state marks, due counts, keys | [chips-and-marks.md](docs/design/system/chips-and-marks.md) |
| Screens, navigation, Today, review | [layout.md](docs/design/system/layout.md) |
| The desktop rail: rows, sections, series, hover | [rail.md](docs/design/system/rail.md) |
| Empty, loading and error states | [empty-states.md](docs/design/system/empty-states.md) |
| Timing, choreography, reduced motion | [motion.md](docs/design/system/motion.md) |
| The lantern, the flame, the wordmark, the app icon | [brand.md](docs/design/system/brand.md) |
| Words on the screen | [voice.md](docs/design/system/voice.md) |
| The `/docs` site | [docs-site.md](docs/design/system/docs-site.md) |
| The phone app: tabs, capture, how screens arrive, which sheet a task gets, review gestures, haptics, widgets | [phone.md](docs/design/system/phone.md) |

## Feature design

What each feature does and where it runs is in [the feature map](PRODUCT.md#features). These files hold how a feature looks and behaves on screen.

- [The streak](docs/design/streak.md)
- [Letting an app in](docs/design/connected-apps.md)
- [Insights](docs/design/insights.md)
- [Library, decks and cards](docs/design/library-decks-and-cards.md)
- [Review completion](docs/design/review-completion.md)
- [Imports and exports](docs/design/imports.md)
- [Activity](docs/design/activity.md)
- [App pages](docs/design/app-pages.md)
- [Explore](docs/design/explore.md)
- [Getting started](docs/design/onboarding.md)
- [The changelog](docs/design/changelog.md)
