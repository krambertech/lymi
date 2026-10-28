# Colour

Use warm neutrals for surfaces and amber for defined actions and states. Card states, errors, success and AI provenance have their own semantic colours.

## Use a token, never a value

**Components use the semantic tokens through Tailwind (`bg-plate`, `text-ink-secondary`, `border-edge`), never a raw hex, an `oklch()` value or a stock Tailwind colour.** Dark mode is a separate warm palette rather than an inversion, so a raw value can fail in the other theme. The values live in `packages/design/tokens.css`; every copy of them is generated, and `pnpm check:design` fails on drift.

```tsx
// Correct
<p className="text-sm text-ink-muted">{t`Due tomorrow`}</p>

// Incorrect: right by day, unreadable at night
<p className="text-sm text-[#72665f]">{t`Due tomorrow`}</p>
<p className="text-sm text-stone-500">{t`Due tomorrow`}</p>
```

The one exception is a third party's own mark, which keeps its brand colours: `GoogleMark` and the brand colour of each connected app in `AppMark`.

Dark theme uses a separate warm-charcoal palette. Panels are lighter than the canvas in both themes. Use [surfaces.md](surfaces.md) for background and elevation roles.

## How a token is named

A colour token's name reads `owner-family-role-job-state`, keeping only the parts it needs, and every part is a word, never a number.

- **Family** is what the colour is for: a ground (`canvas`, `rail`, `sheet`, `plate`), `ink` for words, `edge` for lines, or a hue role (`amber`, `success`, `danger`, `ai`, `state-*`).
- **Role** names which one of the family: `ink-secondary`, `ink-muted`, `plate-nested`, `edge-strong`.
- **Job** says how a hue is used: `-ink` for words on it, `-text` for it as words, `-mark` for an icon, `-soft` and `-tint` for a wash ([Fill, text and mark](#fill-text-and-mark)).
- **State** comes last: `plate-hover`, `rail-chosen`.
- **Owner** starts a token that belongs to one thing: `lantern-`, `lit-` for a reviewed day, `key-` for the capture button, `glass-` for the phone's Liquid Glass, `toast-` and `grade-`.

`amber` is the one hue named by its colour, because it is the lantern's light and [Amber means act](#amber-means-act) gives it one meaning. `pnpm check:styling` rejects the names this grammar replaced, and `node scripts/rename-tokens.mjs` rewrites them.

## Which text colour

Text on canvas meets 4.5:1 in both themes, `ink-muted` included.

```text
Is it text on a coloured fill?
 ├── On amber → text-amber-ink
 ├── On a due count's tint → the DueCount component, never by hand
 ├── On the toast, which is ink → text-canvas; its action is text-toast-action
 └── No
      ├── An error → text-danger
      ├── A success → text-success
      ├── The term, a title, anything the screen is about → text-ink
      ├── Supporting prose, a secondary label, a ghost button → text-ink-secondary
      ├── Metadata, a hint, a unit, a timestamp → text-ink-muted
      └── Decoration that is not a word (a chevron, a separator dot) → text-ink-faint
```

`ink-faint` is decorative and never carries words, because it fails 4.5:1.

## Fill, text and mark

A hue comes in up to three strengths, and the job decides which one a component uses:

| Strength | For | Contrast it holds | Amber |
| --- | --- | --- | --- |
| Fill | A surface you press or that lights up, with ink on top | Its ink holds 4.5:1 on it | `amber`, with `amber-ink` |
| Text | Words | 4.5:1 on `canvas` | `amber-text` |
| Mark | An icon or dot beside a word, which the word explains | 3:1 on `plate-nested`, the lightest ground a mark sits on | `amber-mark` |

**Add a separate mark token when the text-strength colour loses its visual identity.** `danger` and `success` work for both text and icons. Amber needs a lighter `amber-mark` for icons: it meets 3:1 against `plate-nested`, while `amber-text` is dark enough for 4.5:1 text contrast. Card-state tokens are for marks and do not carry text.

In dark theme the fill is already light enough for every job, so `amber-mark` is `amber` there.

```tsx
// Correct: an icon beside the word it marks
<Zap className="text-amber-mark" aria-hidden="true" />

// Incorrect: a text strength on an icon reads as brown by day
<Zap className="text-amber-text" aria-hidden="true" />
```

A mark never carries a word, because 3:1 is not enough for text.

## Amber means act

Amber has exactly these uses. Anything not on the list stays neutral.

1. The flame, in the lantern and in `Flame`.
2. The one thing to press on the page: `Button variant="primary"`.
3. The capture button, which is the app's standing action rather than the page's.
4. A due count, as `DueCount`: the number in ink on `amber-tint`, never amber text, which in light theme has to darken to brown to be readable.
5. A day the learner reviewed: the seven lights, the streak modal's month and goal track, the thirty-day strip and the Insights day grid. Use the shared `well` and `lit` treatments at every size.
6. The Easy grade's icon, `text-grade-easy`, which is `amber-mark`.
7. An important card’s filled star in `amber-mark`, beside the term in deck lists and before Important on the card page. It is a status mark with a visible or accessible label.
8. A warning that an action is out of reach for now, as `Notice tone="warning"`: an `amber-mark` icon and ink text on `amber-soft`, above the controls it disables. This treatment distinguishes a temporary restriction from an error.
9. The phone's chosen tab: its filled icon in `amber-mark` and its label in `amber-text`. Native tab bars use this tint to distinguish selection from muted inactive tabs; the web rail uses a neutral selected row ([phone.md](phone.md)).

A checkbox or switch is amber when checked. The phone review’s example also uses amber while requested audio loads or plays. A status chip repeated down a list, as `StateChip` down a deck table or due counts down Library, is one decision shown many times, not many uses of amber.

Never amber for: any other selected state (a chosen chip is ink, see [chips-and-marks.md](chips-and-marks.md)), a tray or a deck tray, a heading, a link, or decoration.

## Card states

Each card state has one colour and one icon, the same everywhere a state shows:

| State | Token | Icon |
| --- | --- | --- |
| New | `state-new` | grey dashed circle |
| Learning | `state-learning` | blue half circle |
| Known | `state-known` | green check circle |

They come from `stateMarks` and `StateIcon` in `components/state-mark.tsx`, which also hold the state words, so New, Learning and Known are written once. Never draw a state mark by hand.

The icon, in its colour, marks the counts on a deck's split plate, the deck's filter menu, each card in a deck's list, every state chip, each row of Insights' Cards plate and the New cards tile on Today. On Insights each state is a row of its mark, its word, a bar in its colour against all the learner's cards, and its count, so the colour is never read alone. A deck carries no stripe: its split is the counts on its plate.

Text stays ink: a state chip is a plain `plate-nested` chip, and the colour lives on its icon. Each state colour is a [mark](#fill-text-and-mark): it holds 3:1 against `plate-nested` in both themes. Known is a brighter green than `good` in light theme, because `good` also colours words and has to hold 4.5:1; in dark theme Known is `good`.

Learning is blue because blue is furthest from amber, `danger` and `success`, so a state never reads as something to press or as an error, and blue and green stay apart for red-green colour blindness. Never make a state amber or mustard: beside amber it reads as dirty orange. `state-learning-soft` and `state-learning-text` are for the site's scheduling figures only.

## Grades

Forgot is a grade, not a state. Its mark is the red turn-back arrow wherever it shows: the Forgot grade, the Forgotten today tile on Today, Review forgotten at the end of a review, and the chip on a relearning card under review, which says **Forgotten** rather than the schedule's name for it. Everywhere else relearning is Learning, because a lapse on a card's schedule table may be months old.

The grade icons use `grade-forgot` (`danger`), `grade-hard` (`ink-muted`), `grade-good` (`success`) and `grade-easy` (`amber-mark`), from `GRADES` in `components/grade.tsx`.

## What the AI wrote

The `ai` token is reserved for the violet AI provenance badge. Show its sparkle and AI label beside an enriched field’s label using `SourceChip size="xs"` in `components/chip.tsx`.

The badge identifies text written by Lymi’s enrichment ([CONTEXT.md](../../../CONTEXT.md)). Apply violet to the badge only; the enriched text uses normal content colours. Review omits field-source badges.

## Status is never colour alone

New, Learning and Known carry an icon and a word. Errors carry an icon. The AI badge carries its mark and its word too, and the whole sentence as its accessible name, because two letters are not a sentence.
