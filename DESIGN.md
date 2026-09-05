---
name: Lymi
description: A vocabulary app with a storm lantern. Warm, calm, quick.
colors:
  bg: "#ffffff"
  surface: "#f8f6f4"
  raised: "#f1eeea"
  hover: "#eae5e1"
  border: "#e1ddda"
  border-strong: "#c7c3bf"
  ink: "#1f1915"
  ink-2: "#4d4641"
  muted: "#706760"
  amber: "#f8ac3d"
  amber-hover: "#ef9d32"
  amber-ink: "#331b06"
  amber-text: "#9f4500"
  amber-soft: "#f8ac3d2e"
  glass: "#f8ac3d38"
  flame-core: "#fff0b4"
  good: "#007d50"
  good-soft: "#007d501f"
  dark-bg: "#140e0a"
  dark-surface: "#1d1713"
  dark-raised: "#28211c"
  dark-hover: "#312924"
  dark-border: "#39312c"
  dark-border-strong: "#4e4640"
  dark-ink: "#f2eee9"
  dark-ink-2: "#c8c3bd"
  dark-muted: "#9f978f"
  dark-amber-text: "#f9b64f"
  dark-good: "#74c692"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
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
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-grade:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "56px"
  button-grade-good:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
    height: "56px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  chip:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-new:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.amber-text}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-known:
    backgroundColor: "{colors.good-soft}"
    textColor: "{colors.good}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px 20px 20px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
    rounded: "{rounded.md}"
    padding: "10px 10px 10px 14px"
---

# Design System: Lymi

The reference rendering of everything below is [design/identity.html](design/identity.html). Open it in a browser. It has a light and dark toggle, the mark at every size, the controls, and three phone screens plus the desktop deck view. When this file and that page disagree, fix the page first and then this file.

Canonical colour values are OKLCH. The hex values in the frontmatter are sRGB conversions for tools that need them.

## 1. Overview

**Creative North Star: "The Storm Lantern"**

A hurricane lamp you carry with you. Lymi is the light you bring to a nightly habit: on while you review, flickering when a card lands, brighter when you are done. The interface around the lantern is plain on purpose. Rounded, quick, standard controls, one warm accent, and a typeface whose o's are true circles so the wordmark and the glass belong together.

The system is light by default. Dark is a warm room lit from inside, with tinted near-black greys, never pure black. Both themes share the same amber and the same shapes, so the app feels like one object at noon and at midnight.

It rejects the editorial dark-mode look (display serifs, neon accents), the dashboard look (hero numbers, rings, charts), the mascot look (a character who talks to you), and generic AI styling (sparkles, purple gradients). See PRODUCT.md for the full anti-reference list.

**Key Characteristics:**
- One typeface, four weights, fixed rem scale at ratio 1.2
- Pure white ground, warm-tinted greys, one amber accent, one status green
- 14 px default corner radius, 40 px controls, 56 px grade buttons
- The lantern is the only illustration and the only thing that animates
- Motion is 150 to 320 ms, ease-out, and always tied to a user action

## 2. Colors: The Lantern Palette

Warm-tinted neutrals on a pure white ground, with amber for the flame and for anything that asks to be pressed.

### Primary
- **Amber** (`#f8ac3d`, `oklch(0.80 0.15 72)`): the flame, the primary button, the Good grade, the "due" count, the progress bar. Also the highlight behind the target word in an example sentence at 18% alpha.
- **Amber Hover** (`#ef9d32`, `oklch(0.76 0.15 68)`): primary button hover.
- **Amber Ink** (`#331b06`, `oklch(0.25 0.05 60)`): text on amber. Never white on amber.
- **Amber Text** (`#9f4500` light, `#f9b64f` dark): amber as text or icon on the page ground. Meets 4.5:1 in both themes. The full-strength amber does not, so never set text in it.
- **Glass** (amber at 22% alpha, 26% in dark): the fill of the lantern's glass.
- **Flame Core** (`#fff0b4`, `oklch(0.96 0.08 88)`): the inner flame only.

### Secondary
- **Known** (`#007d50` light, `#74c692` dark): status green for cards that have graduated. Used in the Known chip and nowhere else.

### Neutral
- **Bg** (`#ffffff` / `#140e0a`): page ground. Light is exactly white. Dark is `oklch(0.17 0.012 55)`, a warm near-black.
- **Surface** (`#f8f6f4` / `#1d1713`): cards, sidebar, panels.
- **Raised** (`#f1eeea` / `#28211c`): progress tracks, wells, the unlit lantern's glass.
- **Hover** (`#eae5e1` / `#312924`): hover fill for secondary buttons and list rows.
- **Border** (`#e1ddda` / `#39312c`): hairlines.
- **Border Strong** (`#c7c3bf` / `#4e4640`): input and secondary-button borders, toggle track when off.
- **Ink** (`#1f1915` / `#f2eee9`): text, and the metal of the lantern.
- **Ink 2** (`#4d4641` / `#c8c3bd`): secondary text, ghost button text.
- **Muted** (`#706760` / `#9f978f`): labels, counts, placeholders. Meets 4.5:1 on Bg in both themes.

### Named Rules
**The One Flame Rule.** Amber appears on a screen for at most three reasons: the flame, the one primary action, and the due count. If a fourth amber thing appears, one of them is wrong.

**The Warm Room Rule.** Dark theme greys carry chroma 0.012 to 0.015 at hue 55. Pure black and pure grey are not in the palette.

**The Metal Takes Ink Rule.** The lantern's handle, cap and base are `currentColor`, so the mark recolours itself with the theme and needs no separate dark asset.

## 3. Typography

**Display Font:** Outfit (with system-ui, sans-serif)
**Body Font:** Outfit (with system-ui, sans-serif)
**Label Font:** Outfit

**Character:** One geometric sans throughout. Outfit's o is a circle, which ties the wordmark to the lantern's glass and the 14 px radius. It is friendly at 600 and quiet at 400, so it carries the word on the card and the label under it without a second family.

### Hierarchy
- **Display** (600, 36px, 1.1, -0.03em): the word or phrase on a review card. On desktop the same role at 52px is the wordmark lockup.
- **Headline** (600, 22px, 1.2, -0.02em): screen and deck titles.
- **Title** (500, 18px, 1.4): the meaning line on a card.
- **Body** (400, 15px, 1.5): example sentences, settings copy, table cells. Max 65ch for prose. The target word inside an example is 600 with an amber-soft highlight.
- **Label** (500, 12.5px, 1.4): counts, timestamps, chip text, column headers. Muted colour. Never uppercase.
- **Pronunciation** (400, 14px, muted): IPA sits under the word in the same family; no monospace.

### Named Rules
**The No Serif Rule.** There is no display serif anywhere in Lymi. If a screen needs more hierarchy, use weight and size within Outfit.

**The Fixed Scale Rule.** Type sizes are fixed rem values, not clamp(). Users view the app at a consistent size, and a word that shrinks in a sidebar looks worse, not better.

**The 16 px Input Rule.** Every text input is at least 16px so iOS does not zoom on focus.

## 4. Elevation

Mostly tonal. Surfaces sit on the ground by colour (Surface on Bg, Raised on Surface) and by 1 px borders. Shadows appear in three places only: the phone-sized card container, the primary button, and the Undo toast.

### Shadow Vocabulary
- **Ambient** (`0 1px 2px oklch(0 0 0 / 0.05), 0 14px 30px -18px oklch(0.3 0.05 60 / 0.35)`): card containers and the app icon tile in light theme. In dark theme it becomes `0 1px 0 oklch(1 0 0 / 0.05) inset, 0 20px 40px -22px oklch(0 0 0 / 0.9)`.
- **Amber Lift** (`0 6px 14px -8px oklch(0.70 0.15 68 / 0.7)`): under the primary button and the Good grade. It reads as the flame's glow, not as a drop shadow.
- **Glow** (`drop-shadow(0 0 18px oklch(0.80 0.15 72 / 0.55))`): the lantern at the end of a session only.

### Named Rules
**The Lift On Hover Rule.** Buttons and grade buttons move up 1 px on hover and back on press. That is the only positional change a control makes.

## 5. Components

Controls are standard shapes at 40 px, 14 px corners, with a 1 px hover lift. Every interactive component has default, hover, focus, active, disabled and, where it loads, a loading state.

### Buttons
- **Shape:** rounded (14px), 40px tall, 16px horizontal padding, 500 weight at 14.5px.
- **Primary:** Amber on Amber Ink text, Amber Lift shadow. One per screen.
- **Secondary:** Bg fill, Border Strong border, Ink text. Hover fills with Hover.
- **Ghost:** transparent, Ink 2 text. Hover fills with Raised.
- **Small:** 32px tall, 12px padding, 10px corners. For toolbars and table rows.
- **Keyboard hint:** a `kbd` inside the button, 11px, 500, in a 5px-rounded tint. On primary it is black at 14% alpha; on secondary and ghost it is Raised with a Border.
- **Focus:** 2px Amber outline, 2px offset. Never removed.

### Grade buttons
- Four in a row, 56px tall, 14px corners, equal width, 8px gap.
- Label at 14px 500, interval underneath at 11.5px Muted with tabular numbers.
- Again, Hard and Easy are Secondary. Good is Amber with Amber Lift. Good is the default focus target on reveal.
- Grading Good or Easy flares the small lantern for 320 ms. Again and Hard do nothing to it.

### Inputs
- 40px tall (44px in the capture sheet), 14px corners, Border Strong border, 16px text.
- Focus: Amber border and a 3px Amber Soft ring. Placeholder is Muted.
- Search fields are 34px in toolbars.

### Chips
- 26px tall, pill, 12.5px 500. Default is Bg fill with Border and Ink 2 text.
- **New:** Amber Soft fill, Amber Text, leading 6px dot.
- **Learning:** default chip, no dot.
- **Known:** Good Soft fill, Good text, leading dot.
- **AI example:** default chip. Marks content the AI wrote. Always present when true.

### Segmented control
- Surface track with Border, 3px padding, 14px corners. Selected segment is Bg with a 1px shadow and Ink text; others are Muted.

### Toggle
- 42 by 26px, pill. On is Amber with a white knob; off is Border Strong.

### Review card
- Surface fill, Border, 24px corners, 24px top padding, 20px sides.
- Order top to bottom: direction and status chip, word (Display), pronunciation with a 28px round audio button, hairline, meaning (Title), example (Body, target word highlighted), then source chips pinned to the bottom.
- Progress bar above the card: 5px, Raised track, Amber fill. A small lantern sits at the left of the top row.

### Lists and tables
- Rows are 14px text, 10px cell padding, hairline separators, Surface fill on hover.
- Word column 600. Meaning column Ink 2 and allowed to wrap. Next-review column Muted, right-aligned, tabular numbers.
- Sidebar nav items are 8px by 10px padding, 10px corners. The selected item is Bg with a 1px shadow. Due counts are Amber Text 600.

### Sheet (quick capture)
- Bottom sheet on the phone, Surface fill, 24px corners, 16px padding, a 36 by 4px grab handle.
- One 44px input, a deck segmented control, an AI assist row with a toggle and the line "You'll see it before it's saved", then Cancel (ghost) and a full-width primary "Add to [deck]".

### Toast
- Ink fill, Bg text, 14px corners, 10px padding. The action is Amber Text at 600 with no button chrome. Six seconds, then gone. Used for Undo only.

### The lantern
- One SVG symbol, four parts: handle (6px stroke, round caps), cap, glass (10px radius, Glass fill, 6px Ink stroke), base. No feet.
- Flame is two paths: Amber outer, Flame Core inner. It flickers on a 2.6s loop under `prefers-reduced-motion: no-preference`.
- **Small glyph** for 16 to 20px: handle, solid amber glass, base. No flame.
- **Unlit** for empty states: Raised glass, Border Strong wick, no flame.
- **Lit** for the end of a session: the flame scales to 1.3 by 1.45, the halo grows to 1.22 and full opacity, and the Glow filter turns on. Under reduced motion this is a crossfade.
- Where it appears: the top bar and sidebar at 18 to 30px, the empty state and completion screen at 132px, the app icon. Nowhere else.

## 6. Do's and Don'ts

**Do**
- Put the word on the card first and everything else second.
- Use amber for the flame, one primary action and the due count. Then stop.
- Set text on amber in Amber Ink, and amber text on the page in Amber Text.
- Keep every control at 40px or taller and every input at 16px or larger.
- Label AI-generated content with the AI chip every time.
- Give every action that changes a card or a schedule an Undo toast.
- Ship both themes together. A component is not done until it works on Bg and on Dark Bg.
- Provide a reduced-motion version of every animation.

**Don't**
- Don't use a serif anywhere.
- Don't use pure black or pure grey in dark theme.
- Don't animate anything that is not the lantern, a hover lift, a card flip or a crossfade.
- Don't add a second illustration, a mascot, or an icon set with a personality.
- Don't put a number in a hero, a ring with a percentage, or a streak counter on the home screen.
- Don't use a sparkle or a gradient to mean "AI".
- Don't confirm with a modal what a toast can undo.
- Don't colour status alone. Chips carry a label, and New and Known carry a dot.
