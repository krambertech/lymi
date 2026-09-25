# Overlays

Every overlay takes the shape of the machine it is on: anchored or centred on a desktop, a drawer from the bottom edge on touch. The primitives in `apps/web/src/client/components/ui` hold both shapes behind shadcn's part names, so a call site never asks which machine it is on ([ADR 0017](../../adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md)).

## Which overlay

```text
What is opening?
 ├── A list of actions from a button → DropdownMenu
 ├── A form the learner asked for (New deck, Edit card) → a sheet: Dialog, kind "moment"
 ├── A question before something that cannot be undone → a question: Dialog, kind "moment"
 │     (only when Undo is impossible; otherwise act at once and offer Undo in a toast)
 ├── A page read over the current screen (a word, the streak) → a place: Dialog kind="place", open state in the URL
 ├── What just happened, after the fact → toast
 ├── The name of an icon control → Tooltip, which IconButton already does
 └── Why one control failed (a pronunciation that would not play) → a tip over that control (ErrorTip)
```

**A modal that asks a question is a last resort; Undo replaces confirmation.** A sheet is not that modal: it is a form the learner asked for.

"Desktop" means `DESKTOP_QUERY` in `lib/device.ts`, `(min-width: 768px) and (hover: hover) and (pointer: fine)`, read by `useOverlayShape` as the overlay opens and held until it closes. The pointer counts as well as the width, so a tablet held in two hands still gets the drawer at 900 px. The shape is frozen while it is open, because crossing the breakpoint mid-edit would remount the form and take the half-typed word with it.

## Questions

A question is a centred dialog on a desktop with its actions in a row, the primary last. On touch it is a drawer with the actions stacked full width and the primary on top, in reach of the thumb. Focus lands on the safe action when the first control is not it (`initialFocus` on `DialogContent`). The safe action is `ghost` and names what stays; the destructive one is `danger` and names the consequence.

```tsx
// Correct
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-[min(92vw,460px)]">
    <DialogHeader>
      <DialogTitle>{t`Archive “${sectionName}”?`}</DialogTitle>
      <DialogDescription><Trans>Nothing is deleted. Restore it from Archived sections in the deck’s menu.</Trans></DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => onOpenChange(false)}><Trans>Cancel</Trans></Button>
      <Button variant="danger" onClick={onArchive}><Trans>Archive section</Trans></Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Incorrect: a hand-rolled overlay has no drawer shape on touch, no focus trap and no scrim
<div className="fixed inset-0 grid place-items-center bg-scrim">…</div>
```

## Sheets

On touch a sheet is a drawer that rises from the bottom edge and can be swiped away. Its title stays pinned at its top and its actions at its foot. When the software keyboard rises, the drawer shortens to the room above the keys and only the fields between scroll, so the title and the action are always in sight. On a desktop a panel pinned to the bottom of a 1400 px window is a phone pattern nobody finished, so the same sheet is a centred dialog. The forms inside know nothing about either shape.

No field takes focus as the drawer opens: the drawer settles first, and the keyboard comes when the learner taps a field. The exception is a drawer that holds the one field it opened for, such as a field chip or a search, which focuses at once. A drawer opened from inside another, such as a choice list over a form, rises over a drawer that stays put under its scrim, the way an action sheet sits over a sheet. A drawer never fills the screen.

## Places

A place is a page that opens over the screen the learner was on: a word, the streak. It looks like a page, so its open state lives in the address (`?streak`, `?card`): the system back gesture closes it, and a reload or a shared link reopens it.

- On touch it fills the screen, arrives from the end edge and leaves by back, which names the screen under it. The phone has no X anywhere, and the motion says how to leave: from the side means back, from below means a drawer to swipe down.
- On a desktop the same place is a side sheet at the end edge (`placement="end"`), a centred dialog, or a panel beside its list when both fit, and ends in an X.

`PlaceBar` in `components/layout/place-bar.tsx` is its first line in every shape and reads the shape from the `Dialog` around it. A view inside a place, such as the daily goal in the streak, puts its own back in the same slot. In a dialog or sheet the bar can carry the view's own title, as the streak and its daily goal do; on the whole screen the bar is only the way back. The rules with pictures are on the design system's Layout page.

## Menus

On a desktop a menu is anchored to its trigger. On touch the same rows rise in a drawer from the bottom edge, where the thumb is, and swipe away. The rows keep their menu roles and arrow keys in both shapes, and a keyboard hint is left out of the drawer because there is no keyboard to hint at. `DropdownMenu` holds both shapes; use shadcn's parts.

`DropdownMenuItem` variants: `default` and `destructive`, for Archive, Remove or Leave. Nothing else exists. A destructive row that can be undone acts at once and offers Undo in a toast; one that cannot opens a question.

Menu rows do not scale on press. The hover is one fill that slides between rows ([motion.md](motion.md#hover)).

## Tooltips

An icon control names itself in a tooltip, never a native `title`, whose delay, look and touch behaviour belong to the browser. `IconButton` does this for you.

- The tooltip waits 500 ms under a still pointer, grows from the side nearest the control over 120 ms and leaves in 80.
- Moving along a row of controls opens the next one at once, with no fade, because the reader is already reading them.
- Keyboard focus shows it without the wait; touch never does.
- Pressing the control, Escape and blur all close it, and a menu button stays quiet while its menu is open.
- It repeats the accessible name, so it is hidden from assistive technology and never stands in for the control's `aria-label`.

`Tooltip` holds the parts, and one `TooltipProvider` at the client root shares the delay so adjacent tooltips hand off.

## Toasts

A toast says what just happened. It is shadcn's Base UI toast with Lymi's colours: the text colour as its fill, a title, at most one action (usually Undo, which stands in for a confirmation dialog), a close button, and an icon for an error. It quotes at most 60 characters of a learner's text, cut at a word, so a long term never turns a toast into a page.

- Position: on a phone above the pill nav; from 640 px in the bottom-end corner. During a review, which has no pill nav, above the grade strip, so an error never covers the grades it is about.
- Stack: up to three, the newest in front and each older one 12 px higher and 10% smaller, so a second archive never takes the first one's Undo away. Pointing at the stack or moving focus into it spreads the toasts into a column 12 px apart.
- Edge: toasts share one colour, so each carries an inset hairline in the room's colour at 25% to show where it ends. It is the toast's only edge.
- Time: each leaves after five seconds, but every timer holds while the stack is open or the window is in the background.
- Dismiss: a swipe down or to the side, or Escape once focus is inside.
- Announcement: an error is announced at once; every other toast waits for a pause.

Toasts keep shadcn's default motion: they rise from below the edge and restack over 500 ms on an ease-out-expo curve. A toast enters and leaves past the bottom of the screen, clearing the pill's gap on a phone, rather than stopping at the gap and vanishing.

## How overlays move

- The drawer rises from the bottom edge over 450 ms on the drawer curve (`--ease-drawer`), follows the finger while it is dragged, and leaves in up to 320 ms, shorter the harder it was flicked.
- A place on touch is the same drawer turned on its side: it arrives from the end edge over the same 450 ms, follows a swipe toward that edge, and leaves the way it came.
- The centred dialog arrives with a card's 6 px rise over 200 ms and leaves in 140 ms, faster than it came.
- On a desktop a menu grows out of the corner nearest its trigger, scale 0.94 to 1 over 140 ms, leaving in 100, because a menu belongs to its trigger; a list that slides in from somewhere else reads as a panel that happened to land there.
- Under reduced motion the phone drawer and the toast crossfade with no travel.
