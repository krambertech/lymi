---
status: accepted
date: 2026-09-13
decision: use shadcn compound component APIs backed by Base UI for interaction-heavy and form foundations
---

# shadcn and Base UI design-system foundations

This proposal records the accepted direction for replacing Lymi's hand-built interaction foundations with locally owned shadcn components backed by Base UI. Delivery is staged in [the implementation plan](../plans/2026-09-13-shadcn-base-ui-design-system.md).

## Opportunity

Lymi's visual system is specific and coherent, but several components also implement difficult browser behavior: focus movement and restoration, popup positioning, portals, dismissal, scroll locking, mobile drawers, listbox navigation and toast timing. Maintaining those mechanics locally spends effort without making the learner experience more distinctive.

The opportunity is to keep Lymi's warm, calm visual language and product components while adopting stronger behavioral foundations and a familiar compound-component API. shadcn added complete Base UI-backed component documentation in January 2026 and preserves the same public abstraction across primitive libraries, while Base UI exposes composition through a `render` prop rather than wrapping application controls.

## Current evidence

The freshly fetched `origin/main` at `a492049` contains 52 client component files. The main interaction foundations are a 265-line custom Menu, 443-line combined Select and Combobox, 170-line responsive Sheet, native-dialog wrapper, 143-line tooltip hook and locally timed Toast.

The existing Menu is already partly compound, but its trigger uses a render function and its positioning, keyboard navigation and outside dismissal are maintained locally. Dialog and Sheet instead expose prop-driven `title`, `actions`, `open` and close callbacks, while Select and Combobox accept option arrays through monolithic facades.

Forms use native React state, shared Zod schemas and small helpers for field errors and focusing the first invalid control. There is no form-state library, and the current needs do not justify adding one during this migration.

Interface icons already use `lucide-react`; the lantern, flame, wordmark and application marks are custom Lymi artwork and remain custom.

## Accepted direction

Generated shadcn Base UI components become the recognizable upstream starting point under `apps/web/src/client/components/ui`. Lymi preserves their export names, compound anatomy, state attributes and `render` composition, while replacing the default visual treatment with the tokens and rules in `DESIGN.md`.

The first phase replaces interaction-heavy foundations: Dropdown Menu, Dialog, Drawer, Select, Combobox, Tooltip and Toast. Each primitive-focused change migrates every caller and removes the superseded API in the same pull request; the repository does not carry two competing component contracts.

The second phase establishes compound form foundations: Field and its semantic parts, Input, Textarea, Checkbox, Radio Group, Switch and Toggle Group. Product controls such as LanguageField, DirectionField, GoalPicker and Segmented remain Lymi components composed from those foundations.

The current Button and IconButton remain Lymi-owned initially because their accessible disabled state, loading behavior, keyboard hints, hit areas and variants express existing product rules. They already forward refs and spread native props, so Base UI triggers can compose them through `render`.

The compound Field parts are the only form-row API. A convenience composite and Native Select were built for issue #127 and removed before merge, so every form is written one way and every choice list is Select or Combobox. Controls forward native form props and refs so a future TanStack Form adoption does not require another component rewrite; TanStack Form itself is not part of this work.

Overlays that change shape adapt inside the shadcn component itself, so there is one component per overlay. `DropdownMenu` is anchored on desktop and a Drawer with the same items on touch; `Dialog` is centred on desktop and a gesture-capable Drawer on touch, for forms and confirmations alike. Each reads the device rule as it opens and freezes that choice while open, so a resize cannot remount a partially completed form. [ADR 0017](../adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md) records the rule, including places such as the streak that keep their state in the URL.

The existing StreakCalendar remains a product visualization. shadcn Calendar, which is a React DayPicker selection control, enters the system only when Lymi has a date-selection journey.

## Boundaries

This work does not restyle Lymi to resemble default shadcn, replace its tokens or motion language, migrate the public site, publish a registry, create a shared UI package, add a form-state library, introduce a date picker, or refactor unrelated product components.

The components themselves are source-owned and can be replaced independently, but the overlay rule cuts across every overlay, so it is recorded in [ADR 0017](../adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md). A later shared package or public registry would be a separate, harder-to-reverse decision.

## Evidence of success

- Production and `/design` callers use recognizable shadcn compound APIs for every migrated foundation.
- Focus, keyboard navigation, dismissal, portal positioning, scroll containment, touch gestures, reduced motion and accessible names work on mobile and desktop.
- Lymi's light and dark visual language, custom icons and product behavior remain unchanged.
- Every old primitive API and unused supporting dependency is removed atomically after its callers migrate.
- Form controls expose the native props, refs and explicit validation states required by both current local-state forms and a possible future TanStack Form integration.

## Sources checked on 2026-09-13

- [shadcn Base UI documentation announcement](https://ui.shadcn.com/docs/changelog/2026-01-base-ui)
- [Base UI composition](https://base-ui.com/react/handbook/composition)
- [shadcn Base UI Drawer](https://ui.shadcn.com/docs/components/base/drawer)
- [shadcn TanStack Form guide](https://ui.shadcn.com/docs/forms/tanstack-form)
