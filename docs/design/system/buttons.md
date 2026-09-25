# Buttons

`Button`, `IconButton` and `buttonClass` in `apps/web/src/client/components/button.tsx`. The design system's Actions page shows every variant live.

## Which control

```text
What does pressing it do?
 ├── Goes to another screen → a router Link; styled as a button with buttonClass() when it is the page's action
 ├── Goes to a row's screen from a list (a deck, a round, a next step) → the whole row is the link, ending in Go; never a button inside a row
 ├── Opens a menu of actions → DropdownMenu with a Button or IconButton as its trigger (see overlays.md)
 ├── An action whose meaning an icon carries alone (Edit, Search, Previous card) → IconButton, with label
 └── Any other action → Button
```

```tsx
// Correct: navigation that looks like a button is still a link
<a href={publicSiteUrl("/docs/mcp")} className={buttonClass("secondary")}>…</a>

// Incorrect: a button that navigates loses open-in-new-tab and the link role
<Button onClick={() => navigate({ to: "/review" })}>{t`Review`}</Button>
```

## Button variants

Variants: `primary`, `secondary`, `ghost`, `danger`. Nothing else exists; an unlisted variant is a bug, not an option. **The default is `secondary`**, so leave `variant` off for an ordinary action.

- `primary` is the one thing to press on the view: amber on `amber-ink`. **One per view.** Two primaries means the screen has no hierarchy, and amber stops meaning act.
- `secondary` is every other action: a plate with an edge. This is the default.
- `ghost` is a way out or a quiet action beside others: Cancel, the safe choice in a question ("Keep member"), Clear filters, a sort button in a toolbar. No plate until hovered.
- `danger` archives, deletes, revokes or removes. Soft red until hovered, and its label names the consequence ("Revoke key").

```text
Is it the single most important action on this view?
 ├── Yes → variant="primary"
 └── No
      ├── Does it destroy, revoke or remove something? → variant="danger"
      ├── Is it the way out, or one of several quiet actions in a toolbar or row? → variant="ghost"
      └── Default → no variant (secondary)
```

A view is what the learner can see and act on at once: a screen, or the dialog or drawer over it. A dialog has its own primary; the screen under it is not a second one. In a question, the safe action is `ghost` and the destructive one `danger`, with no `primary` at all.

```tsx
// Correct, from member-dialogs.tsx
<Button variant="ghost" onClick={() => onOpenChange(false)}><Trans>Keep member</Trans></Button>
<Button variant="danger" onClick={onRemove} loading={pending} aria-disabled={pending}>
  <Trans>Remove member</Trans>
</Button>

// Incorrect: "outline" does not exist, and a second primary flattens the choice
<Button variant="outline">Keep member</Button>
<Button variant="primary">Remove member</Button>
```

## Button sizes

Sizes: `sm` 32 px, `md` 40 px, `lg` 48 px, `xl` 64 px. Nothing else exists. **The default is `md`**, so leave `size` off.

```text
Where does the button sit?
 ├── Today's due card, as the Review action or what stands in for it → size="xl", full width. Nowhere else.
 ├── The end of a flow where the button is the whole answer (auth screens, Done) → size="lg"
 ├── Inside a row, a table header, a toolbar or a chip row → size="sm"
 └── Anywhere else, including forms and dialogs → no size (md)
```

`sm` stretches its hit area to 44 px with a pseudo-element, so it is safe on touch. Never change a button's height with `className`: if none of the four sizes fits, the design is asking for something new, so raise it rather than overriding.

## IconButton

`IconButton` holds one icon and requires `label`, which describes the action, not the icon ("Edit card", never "Pencil"). The label is the accessible name and shows as the tooltip, so never add a `title`. Its default variant is `ghost` and default size `md`; it takes `sm`, `md` and `lg` but not `xl`. `round` makes a circle, for the pronunciation button and capture only.

In a screen's top bar every control is a square ghost `IconButton` at 40 px, except capture, which is round and amber (see [layout.md](layout.md)).

## States

Every button has default, hover, focus, active and disabled, and `loading` where a request runs.

- Hover uses the `hoverable:` variant (`hoverable:hover:bg-hover`), so a touch screen never keeps a stuck hover. Never write a bare `hover:` on a control.
- Press scales to 0.97 over 150 ms. Nothing lifts.
- `loading` keeps the button's width, shows a spinner and swallows a second press.
- `kbd="N"` shows a keyboard hint beside the label, on desktop only.

**A button is never taken away for being unable to run yet.** `disabled` drops it out of the tab order and tells a screen reader nothing about what is missing, so a greyed-out submit leaves the learner with no way to ask. Forms stay pressable and validate on submit ([forms.md](forms.md)). Use `aria-disabled` when pressing cannot do anything, mid-request or with no handler: it keeps the button focusable and announced while swallowing the press.

```tsx
// Correct
<Button variant="primary" loading={saving} aria-disabled={saving}>{t`Create deck`}</Button>

// Incorrect: the learner cannot find out why it will not press
<Button variant="primary" disabled={!name}>{t`Create deck`}</Button>
```

## Labels

"New deck" opens the form; "Create deck" submits it. The destructive button names the consequence ("Revoke key") and the safe one names what stays ("Keep key"). More in [voice.md](voice.md).
