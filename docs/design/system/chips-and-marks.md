# Chips and marks

Small labels that describe: a card's state, where a field came from, how many cards are due, a key to press. None of them is a button, and none is amber except the due count.

## Which one

```text
What does the label say?
 ├── A card's state (New, Learning, Known, Forgotten recently) → StateChip, or StateIcon beside a count
 ├── Where a field came from → SourceChip; compact beside a field's label, full in a chip row
 ├── How many cards are due → DueCount
 ├── A keyboard shortcut → Kbd
 ├── A status that failed (an import that stopped) → Chip tone="danger"
 └── Any other short fact (a tag, a role, a status) → Chip
```

## Chip

`Chip` in `components/chip.tsx` is a pill on `plate-2`.

Tones: `default`, `ai`, `danger`. Nothing else exists. **The default is `default`**; `ai` belongs to `SourceChip`, so a call site uses it only through that component.

Sizes: `xs` 17 px, `sm` 22 px, `md` 26 px, `lg` 28 px. Nothing else exists. The default is `md`. Use `sm` beside other text in a row or a people list, `md` on its own, and `lg` only for the state chip on a card under review (`StateChip size="lg" inReview`). `xs` is the AI badge only.

```tsx
// Correct, from activity-view.tsx
case "importing":
  return <Chip>{t`Importing`}</Chip>;
case "failed":
  return <Chip tone="danger">{t`Stopped`}</Chip>;

// Incorrect: "success" is not a chip tone, and a card state is StateChip, whose colour is on its icon
<Chip tone="success">Known</Chip>
```

## StateChip and StateIcon

`StateChip` shows a card's state as the state's icon on a plain chip, so the colour is the mark's alone and the text stays ink. It takes `sm`, `md` or `lg`, and `inReview` under review. There a relearning card says what happened, **Forgotten recently**, with the Forgot grade's mark; elsewhere the lapse may be months old, so it is plain Learning.

`StateIcon` in `components/state-mark.tsx` is the mark on its own, for a count or a row. The colours and why they are what they are: [colour.md](colour.md#card-states).

## SourceChip

`SourceChip` says who wrote a field: the lesson, the AI, or the learner ("You").

- `compact` is the badge form: the mark and one word, beside the label of the field it belongs to. Only the AI's source is shown this way; the learner's and the lesson's carry no badge.
- The full form names all three sources where a chip row has the space and the comparison helps, as under a review's answer.

## DueCount

`DueCount` in `components/due-count.tsx` is the number of cards due, in ink on `amber-tint`, never amber text. It takes `sm` (the default, in a row) or `lg`. It is one of amber's allowed uses; down a list it repeats once per row, which is still one decision.

## Kbd

`Kbd` in `components/kbd.tsx` shows a key. Tones: `default` on a plate, `on-primary` inside an amber button, `on-ink` on the toast. `Button`'s `kbd` prop picks the tone for you; use `Kbd` directly only in copy or a shortcut list. A keyboard hint never shows on touch.

## The chosen chip

A filter chip that is chosen is a solid `text` fill with `canvas` text, and its count goes to 60% of that: `bg-text text-canvas`. It is the only selected state a chip has. Amber is out because amber means act, and the segmented control's plate on `plate-2` has too little contrast against the canvas at chip size. It is drawn in place, not by `Chip`, as in the site's `ExploreCatalog` and the product's deck glossary.

```tsx
// Correct, from ExploreCatalog.tsx
chosen ? "bg-text text-canvas" : "bg-plate-2 text-text-2 hoverable:hover:bg-hover"

// Incorrect: amber marks what to press, not what is chosen
chosen ? "bg-amber text-amber-ink" : "bg-plate-2"
```
