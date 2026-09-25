# Type

One family, Onest, self-hosted as a variable font declared for weights 400–600, with Latin, Latin extended and Cyrillic files. The word on the card is the largest thing on any screen.

## The scale

Use the Tailwind size classes below; the role names are what DESIGN.md's frontmatter calls them. Never an arbitrary size such as `text-[15px]`: the scale is set in rem so it follows the reader's default font size, and a px value breaks that. Sizes here are px at the 16 px default.

| Role | Class | Size | Weight | Where |
| --- | --- | --- | --- | --- |
| count | `text-6xl`, `text-7xl` | 60, 72 | 500 | The count that ends a review, phone then desktop; nothing else |
| word | `text-5xl` | 46 | 500 | The term on a review card, desktop |
| word-phone | `text-4xl` | 38 | 500 | The term on a review card, phone |
| hero | `text-3xl` | 30 | 500 | A stat plate's figure, the streak number |
| title | `text-2xl` | 24 | 500 | The page title (`h1`) |
| meaning | `text-xl` | 20 | 400 | The meaning under the term; the getting started guide's title |
| subhead | `text-lg` | 17 | 500 | A section or plate title (`h2`), an empty state's title |
| lede | `text-md` | 15.5 | 400 | A lede under a title, docs prose, `BackButton`, a large button |
| body | `text-base` | 14.5 | 400 | Everything else: rows, forms, buttons, descriptions |
| label | `text-sm` | 13 | 500 | A small button, a field note, secondary row text |
| caption | `text-xs` | 12 | 500 | Chips, uppercase labels, timestamps |
| kbd | `text-2xs` | 11 | 600 | Keyboard hints, the AI badge |

The scale is hand-tuned rather than a ratio: text sizes climb by 1 to 1.5 px from 11 to 17, display sizes by about 1.2 to 1.27 from 20 to 46, and the count that ends a review alone goes to 60 and 72. On any touch screen a form control's text is 16 px (`text-[1rem]` through `controlSize`) so iOS does not zoom on focus; see [forms.md](forms.md).

```tsx
// Correct: a section heading
<h2 className="text-lg font-medium">{t`Also on your list`}</h2>

// Incorrect: off the scale, and bold
<h2 className="text-[18px] font-bold">{t`Also on your list`}</h2>
```

## Weight

400 for reading text, 500 for titles, labels and the word, which is set at 500 rather than bold. 600 is for the wordmark, counts and `Kbd` only. Never 700.

## Tracking, figures and case

- Headings track −0.02em (`tracking-[-0.02em]`), the word −0.03em, body never.
- Tabular figures (`tabular-nums`) on figures that line up in a column, never on a control whose label happens to hold a digit: Onest's tabular 1 carries side bearings wide enough to pull "Lezione 12" apart. `Button` leaves them off for that reason.
- Uppercase only at 12 px (`text-xs`), tracked +0.06em, weight 500, in `muted`.
- Curly quotes and the ellipsis character in copy: “ ” ’ …, never straight quotes or three dots.

## Long words

A term or meaning long enough to wrap carries the `hyphenate` utility (`hyphens: auto` with at least three letters each side of the break) and the text's own `lang`, so a German compound breaks at a joint rather than anywhere. A cue or target too long for its review card steps down the scale at most twice before the card scrolls.

## Monospace

`font-mono` is a system monospace stack, with nothing downloaded, and it has two jobs:

- Code on the docs site.
- Strings in the app that are proofread character by character rather than read: an API key, a client's hostname, a header name in copy. Onest draws 0 and O, and 1 and l, too alike for a secret where a mistyped character is a silent 401.

Nothing else uses it: not numbers, not code-like labels, not UI text. The design system page sets its state annotations in it for the same reason as the docs, so a note about a component never reads as part of the component.

## Wordmark

The wordmark is drawn as paths, not set in type; see [brand.md](brand.md).
