---
status: accepted
date: 2026-09-13
---

# Interface primitives are shadcn components on Base UI, and overlays adapt by kind and device

The product app's interactive foundations are shadcn components built on Base UI, copied into `apps/web/src/client/components/ui`, restyled with Lymi's tokens, and used through shadcn's compound APIs. An overlay's kind is the caller's choice and its shape is the device's: on a touch device every menu, form and confirmation is a drawer from the bottom edge.

## Context

`docs/stack.md` said shadcn supplied the accessible primitives, but it was never installed. Every foundation was written by hand on `<dialog>`, the `popover` attribute and custom keyboard handling, with vaul for the phone drawer, and vaul is no longer maintained. The [accepted proposal](../proposals/shadcn-base-ui-design-system.md) sets the direction and the component order.

The overlays showed what that cost. `Sheet` decided "desktop" by width and a fine pointer, the streak modal by width alone, and card detail by a container query, so a touch tablet got a drawer for one form and a centred modal for the streak. Menus stayed small anchored lists on a phone. The open card closed on Back; the full-screen streak did not. Four open-and-close implementations disagreed on scroll lock, backdrop presses and focus return. Left to each component, overlay shapes drift like this again, and the rule cannot be reversed one component at a time, so it is recorded here.

## Decision

A component added with `shadcn add` keeps its export names, compound anatomy, data attributes and `render` composition. Its classes are rewritten to Lymi tokens (`bg-plate`, `text-text`, `edge-2`) and DESIGN.md's sizes and motion. shadcn's colour variables are not added, because `muted` already names a text colour in Lymi and two vocabularies would drift. `Button`, `IconButton` and product components such as `Streak`, `LanguageField` and `GoalPicker` stay Lymi-owned and compose the primitives.

Every overlay is one of two kinds.

- A **moment** is something the learner does and dismisses: a menu, a form, a confirmation. Its state is local, and Back does not track it.
- A **place** is something the learner goes to and reads: the streak, an open card. Its state is a URL search parameter, so Back closes it, a reload keeps it and a link opens it.

The shape comes from one rule, `(min-width: 768px) and (hover: hover) and (pointer: fine)`, read as the overlay opens and held until it closes.

| Kind | Desktop | Touch |
| --- | --- | --- |
| Menu | Dropdown anchored to its trigger | Drawer with the same items and menu semantics |
| Choice | List anchored under its box | Drawer with the same rows and listbox semantics |
| Form | Centred dialog | Drawer |
| Confirmation | Centred dialog, actions in a row | Drawer, actions stacked with the primary on top |
| Place | Centred dialog, docked beside the page, or a side sheet at the end edge | Drawer over the whole screen, with a close button |

The adaptation lives inside the shadcn component itself: `DropdownMenu` and `Dialog` render their desktop shape or a drawer from the same parts, so a call site uses shadcn's names, never branches on the device, and has no second component to choose instead. Every part a component exports is tested in both shapes; a part no screen uses is left out until it brings its drawer shape and tests. Tooltip stays anchored to its control everywhere, and so does Popover, which therefore holds a note about a control and never controls of its own. Select and Combobox were first kept anchored too, and joined the rule on 13 September 2026 when their migrations landed: on a phone a list of choices belongs under the thumb the way a menu does, stacking over the form drawer that holds it. A searchable list keeps its search field at the top of the drawer and one list height while it filters, so the drawer does not jump with each letter. A place that is read alongside a list, such as an open card, gained the side sheet on 15 September 2026: docking it beside a page too narrow for both squeezed the list, and a centred dialog hid the list the learner was walking. A place on touch first entered full screen from the end edge with a back button, and became a drawer over the whole screen on 14 September 2026 when the streak moved: a sideways push read as navigation the tap had not asked for, and every other phone overlay rises.

## Considered options

- **Keep the hand-built primitives and add an adaptive layer:** rejected. It keeps an unmaintained drag library, and nesting, scroll lock and focus return stay our code.
- **Lymi prop-driven facades such as `<Sheet title actions>` over Base UI:** rejected. The first attempt worked, but it hid the compound API behind a second contract that every new primitive would have to reinvent.
- **Adaptive composites such as `ResponsiveMenu` beside unchanged shadcn copies:** rejected. It kept the copies closer to upstream, but it left two components for every overlay and a choice nobody should have to make.
- **Radix as the base:** rejected. Radix has no drawer, so vaul would stay, and shadcn now defaults to Base UI.
- **Anchored menus and centred confirmations on touch:** rejected. On a phone they sit away from the thumb, and a drawer is how the forms already open.
- **Alias shadcn's colour variables to Lymi tokens:** rejected because of the `muted` collision.

## Consequences

`@base-ui/react` and `cn` join the stack, vaul leaves it once the last sheet moves, and components gain real-browser tests in Vitest browser mode on desktop Chromium and touch Chromium and WebKit. Each primitive needs a restyle pass before use; `shadcn add --diff` still shows upstream changes, though our classes will always differ.

The implemented direction is summarized in [the proposal](../proposals/shadcn-base-ui-design-system.md).
