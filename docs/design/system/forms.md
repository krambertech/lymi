# Forms

Every form is built from the parts in `apps/web/src/client/components/ui`: `Field` for the row, then one control. A form reads as one row repeated, so every control is the same box.

## Which control

```text
What is the learner giving?
 ├── Text they type → Input, or Textarea for more than one line
 ├── Several short tags → TagsInput
 ├── On or off
 │    ├── Applies the moment it changes (a setting) → Switch
 │    └── Rides along with an action the form submits → Checkbox
 ├── Several of a fixed set → a Checkbox per option, each in a horizontal Field (ReviewModesField)
 └── One of a fixed set of options
      ├── 2–4 short views of the same thing (Theme, a chart's range) → Segmented
      ├── 2–5 choices that each need a sentence → RadioGroup of RadioCard
      ├── Up to 15 options, or the learner's own list (decks, sections) → Select
      └── A fixed list longer than 15 that is searched by name (languages) → Combobox
```

A short list is picked from and a long one is searched. `ToggleGroup multiple` has no product use yet, so raise a new multi-choice shape before building one. Never the platform `<select>`: its list is the one thing in a form the palette does not reach.

## The control box

Every control is 44 px tall on the phone and 40 px on a desktop, with 16 px text on any touch screen, a tablet included, so iOS does not zoom on focus. Input, Select and Combobox take this from `controlSize` in `components/ui/input.tsx`; Textarea takes only its text size from `controlText`, so its height follows its content. Never resize a control with `className`, and never make a larger cut for "the one field that matters": a form with three type sizes looks unfinished, and the field that matters is already first.

Controls size by the **viewport**, not the container. A phone is a phone whatever it is nested in, and a sheet renders in a portal where a container query has nothing to measure and would silently never fire.

## A form row is a Field

Put `FieldLabel` above the control, then `FieldDescription` and `FieldError` under it. The parts wire themselves, so never write an `id` or `aria-describedby` by hand.

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

A settings screen, such as Settings or a deck's settings, has no Save button: a change is made when it is made, and every one is reversible. A switch, a select or a radio saves on change; a text field saves on blur and when the learner leaves the screen. The screen's `status` shows Saving…, then Saved with a check, or the error, beside the title.

A Save, Create or Add button belongs to a sheet: a form the learner opened to make or change one thing, which submits as a whole.

## Validation

Forms stay pressable and validate on submit, never by disabling the submit button ([buttons.md](buttons.md#states)). Parse with the same Zod schema the route uses, show the message under the field with its icon, and move the caret to the first thing that is wrong. The messages live on the schema in `packages/core`, so what the API says on a 400 is what the field says under the control.

A field error says how to fix it: "Keep the term under 500 characters."

## Select and Combobox

Both are the same box as every other control when closed.

`Select` takes the shape of the machine the way a menu does. On a desktop a panel unfolds under the box, 4 px and scale 0.98 over 140 ms; the arrows walk the rows and typing a letter jumps to a name. On a touch device the same rows rise in a drawer under the thumb and swipe away, and inside a form sheet that drawer stacks over the form's. The rows are the control's height, and the chosen one leads with a check in a slot every row keeps. The hover is the one sliding fill, so the keyboard's row, not the pointer's, is the row Enter picks.

`Combobox` is a Select you search, and takes the machine's shape the same way: a panel under the box on a desktop, or above it when there is more room, and a drawer titled with the field's name on touch. The search field leads and takes focus, and the list keeps one height in the drawer while it filters, so the drawer does not jump with each letter. The names filter as you type, the first match is highlighted so Enter takes it, and a letter typed on the closed box opens it with that letter searched.

Anything a list accepts beyond its rows, such as a language tag it has never heard of, belongs to the product field that holds it (`LanguageField`), not to the primitive.

## Choice controls

`Checkbox`, `Switch`, `RadioGroup` and `ToggleGroup` are Base UI parts that submit with a native form under their `name`. `Segmented` is `ToggleGroup`'s look in the product: the track, the plate and the heights.

- A checkbox or switch sits in a `Field orientation="horizontal"` with its label, so the label names it and presses it.
- A radio group is named by its legend or `aria-label`, and each item takes its name from its own Field or, in a `RadioCard`, from the row's title.
- A radio group and a toggle group are each one Tab stop. In a radio group the arrows move the choice, as on any platform; in a toggle group they move focus and Space or Enter chooses. The arrows skip a disabled option, which is still read out with the rest.
- The hit area reaches 44 px through a pseudo-element, so a 20 px box never moves the row around it.
- Checked is amber on a checkbox and a switch, and ink on a radio, where selection is the ring and the dot.

## Sheets

A form the learner asked for opens as a sheet: a `Dialog` that is a centred dialog on a desktop and a drawer on touch. How the drawer handles the keyboard and focus is in [overlays.md](overlays.md#sheets).
