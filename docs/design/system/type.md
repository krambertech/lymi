# Type

Onest is the interface family, self-hosted as a variable font declared for weights 400–600, with Latin, Latin extended and Cyrillic files. Scripts it does not cover use the language-specific system faces below. Review gives the card’s term the largest content text.

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

The scale uses smaller increments for reading sizes, 1–1.5 px from 11 to 17, and ratios of roughly 1.2–1.27 for display sizes from 20 to 46. Review completion counts use 60 and 72 px. Touch form text is the 16 px exception, applied through `controlSize` as `text-[1rem]` ([forms.md](forms.md#the-control-box)).

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

## Long words

A term or meaning long enough to wrap carries the `hyphenate` utility (`hyphens: auto` with at least three letters each side of the break) and the text's own `lang`, so a German compound breaks at a joint rather than anywhere. A cue or target too long for its review card steps down the scale at most twice before the card scrolls.

## Languages, readings and stress

Content carries its own language, independent of the app language. Pass the card's language to its term, reading and example; a section name uses the section's name language. The `--face-<script>` tokens in `packages/design/tokens.css` and their `:lang()` rules choose system faces for scripts Onest does not cover, so shared kanji take Japanese forms on a Japanese card and Chinese forms on a Chinese one. Never name a fallback face in a screen; [phone.md](phone.md#components) owns the native rendering differences.

Use `TermText` for a card's term and `ExampleText` for its example, both in `components/term-text.tsx` and the phone's `ui/term-text.tsx`. They draw the language's reading above the text, stress in place, or plain text; a screen never parses or draws those marks itself. [CONTEXT.md](../../../CONTEXT.md#content) owns what Reading and Stress mean and when review shows them.

Readings are secondary text at weight 400, with no tracking. Kana readings are half the text's size, at least 10 px; readings in letters are 0.4 of it, at least 10 px and at most the 15.5 px lede, with space between syllables. Jyutping tone numbers are raised without growing the line. Hiding a reading preserves its layout space, including when Known readings fade from an example, so reveal changes what can be read without reflowing the line. Stress marks replace the plain term in place instead of taking a separate line. Native wrapping, Dynamic Type and screen-reader behavior belong in [phone.md](phone.md#components).

## Text direction

The interface's direction and the content's direction are separate. Logical spacing follows the interface; a term or example takes `textDirection(language)` from `@lymi/core`, while free text such as a meaning or a deck name uses `dir="auto"`. A language tag's explicit script wins, so a language written in both scripts is not forced right to left by its primary tag. `TermText` and `ExampleText` set their own language and direction; a block aligns to its content's start, while an inline value stays in the row's layout.

Isolate learner text inside an interface sentence with `isolate()` from `@lymi/core`, including names in confirmations, notices and toasts. Keep Lingui's message stable with a labelled placeholder, such as ``t`Archive “${{ name: isolate(name) }}”?` ``. On the web, `<Trans>` uses `BidiTrans` at the root; a custom rendering of a translated string uses `bidi()` from `lib/bidi.tsx`, which turns the isolated runs into `<bdi>` because WebKit does not reliably honor the invisible characters alone. Accessible names and hints take plain text without isolation characters.

On the phone, `Text` takes `lang` for writing direction and script faces; a standalone block uses `textStart(language)` from `theme/type.ts` to align to its content's start. A row keeps the app's alignment. Input behavior is in [forms.md](forms.md#text-language-and-direction).

## Monospace

`font-mono` is a system monospace stack, with nothing downloaded, and it has two jobs:

- Code on the docs site.
- Text that must be checked character by character, such as an API key, client hostname or HTTP header name. Monospace distinguishes characters such as 0 and O, or 1 and l, more clearly than Onest.

The design system page sets its state annotations in it for the same reason as the docs, so a note about a component never reads as part of the component. Numbers, code-like labels and other interface text stay in Onest.

## Wordmark

The wordmark is drawn as paths, not set in type; see [brand.md](brand.md).
