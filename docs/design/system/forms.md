# Forms

Build forms from `Field` and the controls in `apps/web/src/client/components/ui`. Use consistent control sizes within a form.

## Which control

```text
What is the learner giving?
 ├── Text they type → Input, or Textarea for more than one line
 ├── Several short tags → a Combobox with `multiple` and a Create row (TagsChip)
 ├── On or off
 │    ├── Applies the moment it changes (a setting) → Switch
 │    └── Rides along with an action the form submits → Checkbox
 ├── Several of a fixed set → a Checkbox per option, each in a horizontal Field; in a row of chips, a DropdownMenu of checkbox rows (ModesChip)
 └── One of a fixed set of options
      ├── 2–4 short views of the same thing (Theme, a chart's range) → Segmented
      ├── 2–5 choices that each need a sentence
      │    ├── The question the form is about → RadioGroup of RadioCard
      │    └── A secondary question in the same sheet → Select with a caption per row
      ├── Up to 15 options, or the learner's own list (decks, sections) → Select
      └── A fixed list longer than 15 that is searched by name (languages) → Combobox
```

Use Select for short lists and Combobox for long searchable lists. `ToggleGroup multiple` has no current product use; establish its interaction before adding one. Use the shared `Select` rather than a platform `<select>` so its popup follows the theme.

## The control box

Controls are 44 px tall on narrow screens and 40 px on desktop. Touch inputs, including on tablets, use 16 px text to prevent iOS zoom. Input, Select and Combobox use `controlSize` from `components/ui/input.tsx`; Textarea uses `controlText` and grows with its content. Keep these sizes consistent, including the form’s main field.

Size controls by the **viewport**. Sheets render in portals that may have no query container, so container queries are unsuitable for this sizing.

## A form row is a Field

Put `FieldLabel` above the control and `FieldError` under it. The parts wire themselves, so never write an `id` or `aria-describedby` by hand.

Where the description goes follows its job, not the screen:

- **It explains the question**, what a choice means or what it affects, so it sits flush under the label and is read before answering: "New cards in this deck get this language."
- **It helps fill the box**, a format, a limit, how to type, or who sees what is written, so it sits under the control where the error replaces it: "At least 8 characters."
- **It describes one option** of a switch, checkbox or radio row, so it sits under that option's own label inside the row.

A field has at most one description; when it seems to need two, the label or the options carry one.

```tsx
// Correct, from new-deck-sheet.tsx
<Field>
  <FieldLabel>{t`Name`}</FieldLabel>
  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t`Lesson 15`} />
  <FieldError>{invalid.name}</FieldError>
</Field>

// Incorrect: hand-wired, and the error never reaches the input's aria-invalid
<label htmlFor="name">Name</label>
<Input id="name" aria-invalid={!!error} />
{error && <p className="text-danger">{error}</p>}
```

- The Field owns validity. A `FieldError` with a message marks the field `data-invalid` and its control `aria-invalid` together; `invalid` on the Field does the same when the message sits elsewhere. A control inside a Field cannot set its own.
- `disabled` on the Field reaches the control.
- `FieldDescription` steps aside while its field shows an error, so the error takes its place rather than stacking under it.
- `FieldLabel`'s `aside` puts a note at the end of the label row: "Optional", or what is left in a field over nine tenths full.
- A capped field carries `maxLength`. Both numbers come from the schema in `packages/core`, never restated in the form.
- `FieldSet` and `FieldLegend` name fields that belong together, or a row whose control is not a box, such as the button that makes the first deck.
- A visually hidden label is still a `FieldLabel` with `sr-only`, as the Language picker in Settings does under a group title that already says Language.

There is no shorthand component: every form is written with the parts, so there is one way to build a row. Input and Textarea are plain elements rather than Base UI's `Input`, which validates natively on Enter and would overrule the Field. Every part takes native props and a ref.

## Settings save as they change

A settings screen, such as Settings or a deck's settings, has no Save button: settings save directly rather than waiting for a separate submit. A switch, a select or a radio saves on change; a text field saves on blur and when the learner leaves the screen. The screen's `status` shows Saving…, then Saved with a check, or the error, beside the title.

A Save, Create or Add button belongs to a sheet: a form the learner opened to make or change one thing, which submits as a whole.

## Validation

Forms stay pressable and validate on submit ([buttons.md](buttons.md#states)). Parse with the same Zod schema the route uses, show the message under the field with its icon, and move the caret to the first thing that is wrong. The messages live on the schema in `packages/core`, so what the API says on a 400 is what the field says under the control; [voice.md](voice.md) has how to word one.

## Select and Combobox

Both are the same box as every other control when closed.

`Select` opens an anchored panel on desktop, moving 4 px from scale 0.98 over 140 ms. Arrow keys move between rows and typing jumps to a matching name. On touch, the rows open in a dismissible bottom drawer, stacked over a form drawer when needed. Rows use the control height and reserve a check slot in every option. Keyboard focus determines the option selected by Enter.

`Combobox` adds search to the same responsive layout: an anchored panel on desktop, above the field if needed, or a drawer named after the field on touch. Focus the search field when opening. Keep the drawer’s list height stable while filtering. Highlight the first match for Enter; typing on the closed control opens it with that search text.

Use `SelectItem`’s `description` when options need explanatory text and the form already uses RadioCards for its main question. New deck uses RadioCards for purpose and a captioned Select for review modes. Set `w-(--anchor-width)` so captions wrap within the field width, and show the selected caption as the field description.

Handle values outside the option list, such as an unlisted language tag, in the product field (`LanguageField`) rather than the shared primitive.

A card's tags are chosen from a chip, `TagsChip`: a `Combobox` with `multiple`, whose search finds the learner's tags in use, those starting with what was typed first, each with its card count on the end. A Create row after them adds the name as typed whenever it is not a tag in use already, and a tag row adds that tag in its own spelling. The list stays open while tags are picked, and the chip then reads the one tag, or how many.

## Text language and direction

`Input` and `Textarea` default to `dir="auto"`, so learner text finds its own direction without turning the form around; keep that default rather than setting the app's direction. Content in a known language carries that language where the control supports it; the example and its translation each keep their own direction. Read text follows [type.md](type.md#text-direction).

## Optional card fields

Card forms keep capture short: term, meaning and deck lead; optional fields wait behind `FieldChipButton` or a choice trigger with the same look. A text chip adds the field after those already shown and focuses it; a choice chip opens its picker and then names the chosen value. Once revealed, a field stays for that card even when emptied. Use `FieldChipRow` for the named, horizontally scrolling row, including its focus-ring room and overflow fades, rather than descriptive `Chip` components. The card-specific fields, ordering and draft behavior belong in [library-decks-and-cards.md](../library-decks-and-cards.md#adding-and-editing-a-card); the phone's keyboard row belongs in [phone.md](phone.md#add-a-word-and-edit-card).

## Choice controls

`Checkbox`, `Switch`, `RadioGroup` and `ToggleGroup` are Base UI parts that submit with a native form under their `name`. `Segmented` is `ToggleGroup`'s look in the product: the track, the plate and the heights.

- A checkbox or switch sits in a `Field orientation="horizontal"` with its label, so the label names it and presses it.
- A switch at the end of a row centres on its label and description together (`self-center`), as the row's leading icon does.
- A radio group is named by its legend or `aria-label`, and each item takes its name from its own Field or, in a `RadioCard`, from the row's title, or from its children when a row carries its own content.
- A radio group and a toggle group are each one Tab stop. In a radio group the arrows move the choice, as on any platform; in a toggle group they move focus and Space or Enter chooses. The arrows skip a disabled option, which is still read out with the rest.
- The hit area reaches 44 px through a pseudo-element, so a 20 px box never moves the row around it.
- One group of `RadioCard`s per form, for the question the form is about. A card leads with an `icon` when the options are kinds of thing, such as a deck's purpose; every card in the group has one, or none does.
- Checked is amber on a checkbox and a switch, and ink on a radio, where selection is the ring and the dot.

## Sheets

A form the learner asked for opens as a sheet: a `Dialog` that is a centred dialog on a desktop and a drawer on touch. How the drawer handles the keyboard and focus is in [overlays.md](overlays.md#sheets).
