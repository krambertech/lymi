# Adopt shadcn and Base UI design-system foundations

**Status:** Accepted for implementation on 13 September 2026. This plan implements the [accepted proposal](../proposals/shadcn-base-ui-design-system.md) within the client design rules in [`DESIGN.md`](../../DESIGN.md); it does not authorize deployment, publication of a registry, or unrelated redesign.

Delivery is tracked in GitHub issues [#119](https://github.com/krambertech/lymi/issues/119), [#120](https://github.com/krambertech/lymi/issues/120), [#121](https://github.com/krambertech/lymi/issues/121), [#122](https://github.com/krambertech/lymi/issues/122), [#123](https://github.com/krambertech/lymi/issues/123), [#124](https://github.com/krambertech/lymi/issues/124), [#125](https://github.com/krambertech/lymi/issues/125), [#126](https://github.com/krambertech/lymi/issues/126), [#127](https://github.com/krambertech/lymi/issues/127), [#128](https://github.com/krambertech/lymi/issues/128), and [#129](https://github.com/krambertech/lymi/issues/129).

## Done when

- Interaction-heavy and form foundations use locally owned shadcn components backed by Base UI with recognizable compound APIs.
- Every migrated primitive retains Lymi's tokens, themes, motion rules, touch sizes and accessible states, and every old API is removed in the same change that migrates its final caller.
- Existing menu, dialog, drawer, selection, language, toast, form-validation and responsive journeys pass focused Chromium and WebKit verification.
- The form primitives accept native props and refs and express validation explicitly without depending on TanStack Form or another form-state library.
- `pnpm check`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass, with the relevant Playwright journeys and `/design` states verified at mobile and desktop sizes in both themes.

## Starting constraints

Base work on a fresh `origin/main` in an isolated checkout because the primary checkout is dirty and divergent. Treat generated shadcn source as the upstream baseline, preserve `lucide-react` as the configured icon library, and keep the custom lantern, flame, wordmark and app marks outside the generic icon system.

The generated components may change their presentation but must not overwrite `DESIGN.md` tokens or global Lymi styles. Record the shadcn style and generated component versions in the pull request that establishes the foundation so later updates can be compared deliberately.

## Work

### 1. Establish the Base UI foundation

Add the Base UI-flavoured shadcn configuration, `@base-ui/react`, composition utility, aliases and `components/ui` boundary without changing rendered product behavior. Configure Lucide, React without RSC, the existing Tailwind CSS entry point and Lymi's import conventions; complete when one generated component builds against the current tokens and no default shadcn theme has replaced them.

### 2. Replace menus

Add the generated Dropdown Menu family, apply Lymi styling and migrate Add, learner, deck and card menus. Preserve router-link composition, disabled and destructive items, keyboard hints, focus restoration and any fluid highlight that can remain purely presentational; complete when the old Menu and menu-only behavior helpers are gone and keyboard plus pointer journeys pass.

### 3. Replace modal surfaces

Migrate information and confirmation dialogs to the generated compound Dialog, then add the generated Drawer and a Lymi `ResponsiveDialog` compound composite. Preserve swipe dismissal, software-keyboard behavior, scroll containment, accessible titles and the frozen mobile-or-desktop choice while open; complete when Add Card, New Deck, API Key creation and Move Card use the new surface and Vaul plus the old Dialog and Sheet APIs are unused.

### 4. Replace selection popups

Migrate short lists to compound Select and searchable lists to compound Combobox in separate focused changes. Keep custom BCP 47 entry inside LanguageField rather than the generic Combobox, preserve clear values, disabled and invalid states, localization and long-list keyboard behavior, and complete when the 443-line combined picker and its behavior helpers are removed.

### 5. Replace tooltips and toasts

Add one Tooltip provider and one Toast renderer at the application root, then migrate IconButton and current feedback callers in separate changes. Preserve accessible names independently of tooltip content, the single prominent Undo action, paused dismissal while interaction is possible and Lymi's restrained presentation; complete when the custom tooltip hook and local toast timers are gone.

### 6. Establish compound fields and text controls

Add Field, FieldLabel, FieldDescription, FieldError, FieldSet, FieldLegend, FieldGroup, FieldContent, Input, Textarea and Native Select. Keep current Zod submission parsing, localized validation messages and focus-first-invalid behavior, provide one optional thin convenience composite, migrate every caller and remove the prop-driven Field API when its final caller moves.

### 7. Establish choice controls

Add Checkbox, Radio Group, Switch and Toggle Group, then rebuild existing switches, direction choices, GoalPicker inputs and Segmented where the generic foundation fits. Keep product-specific explanation, immediate-save and review-goal behavior in product components; complete when generic choice semantics and styling have one source without flattening those product controls into configuration-heavy primitives.

### 8. Verify the complete system

Update `/design` to show every canonical part and its default, hover, focus, disabled, invalid, loading, open and reduced-motion states. Run the repository checks and affected Playwright suites for core learning, deck creation, language selection, word detail and streak behavior, then inspect mobile and desktop layouts in light and dark themes; complete only when skipped or unavailable evidence is reported explicitly.

## Delivery and recovery

Deliver each issue as one focused pull request in dependency order. A failed primitive migration is recovered by reverting that pull request, which restores both the old component and all of its callers; do not leave a compatibility layer or partially migrated call sites as the recovery mechanism.

## Out of scope

Default shadcn visual styling, public-site components, a shared package or registry, TanStack Form integration, React DayPicker, StreakCalendar replacement, new product behavior and production deployment remain separate work.
