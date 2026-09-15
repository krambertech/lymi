---
status: implemented
date: 2026-09-13
decision: use locally owned shadcn components backed by Base UI for interaction foundations
---

# shadcn and Base UI foundations

This proposal is implemented. [ADR 0017](../adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md) owns the component and overlay contract; `DESIGN.md` owns the visual and interaction rules.

## Lasting rationale

Lymi should own its warm, calm visual language without maintaining difficult browser mechanics such as focus movement, popup positioning, portals, dismissal, scroll locking, listbox navigation, and mobile drawer gestures.

Generated shadcn components backed by Base UI provide the recognizable starting point under `apps/web/src/client/components/ui`. Lymi preserves their compound anatomy and state attributes, then applies its own tokens and product behavior.

Interaction-heavy foundations use these primitives. Product controls remain Lymi components composed from them. Buttons, icons, the lantern, the flame, and product visualizations stay custom where they express a product rule rather than generic browser behavior.

An overlay has one product component. Menus remain anchored on desktop and use a drawer on touch; dialogs are centred on desktop and use a drawer on touch. The chosen form is fixed while open so resizing cannot remount unfinished work.

This direction does not make Lymi look like default shadcn, add a form-state library, create a shared UI package, or publish a component registry.
