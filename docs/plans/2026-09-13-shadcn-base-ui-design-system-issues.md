# shadcn and Base UI migration issue drafts

**Status:** Draft issue set for the [accepted implementation plan](2026-09-13-shadcn-base-ui-design-system.md). These drafts have not been posted to GitHub and do not authorize deployment.

## Shared completion rules

Each issue should produce one focused pull request, migrate every caller of the primitive it replaces, delete the superseded API in that same pull request, update `/design`, run the closest affected Playwright journey first, and finish with `pnpm check`, `pnpm typecheck`, `pnpm test` and `pnpm build`. Interaction changes require mobile and desktop inspection in light and dark themes, including keyboard, pointer, touch and reduced-motion paths where applicable.

## 1. `chore(ui): establish the shadcn Base UI foundation`

**Outcome:** Lymi can add generated shadcn components backed by Base UI without adopting the default shadcn visual theme.

**Scope:** Add `components.json`, `@base-ui/react`, the current shadcn composition utility, aliases and `components/ui`; configure `rsc: false`, TypeScript, the existing Tailwind entry point and Lucide; generate one low-risk component as a build proof; document the local ownership and update approach in `DESIGN.md`.

**Acceptance:** Existing screens render unchanged, Lymi tokens remain authoritative, generated imports resolve in the app and the pull request records the generated source version or date.

## 2. `refactor(ui): replace menus with Base UI dropdowns`

**Depends on:** Issue 1.

**Outcome:** Add, learner, deck and card menus use the shadcn Dropdown Menu compound API.

**Scope:** Support triggers composed through `render`, action and link items, separators, disabled and destructive states, icons, keyboard hints, alignment and side placement; keep the fluid highlight only as a presentation layer that does not own focus or selection.

**Acceptance:** Arrow keys, Home, End, Escape, Tab, outside press, selection and focus return work; router links retain navigation behavior; the old Menu and unused menu helpers are removed.

## 3. `refactor(ui): replace dialogs with Base UI compounds`

**Depends on:** Issue 1.

**Outcome:** Information and confirmation dialogs expose the standard shadcn Dialog anatomy.

**Scope:** Migrate installation help, keyboard shortcuts and sign-out confirmation to Dialog content, header, title, description, footer and close parts while preserving controlled opening where no local trigger exists.

**Acceptance:** Titles and descriptions are announced correctly, focus is contained and restored, Escape and permitted outside presses close, and the old prop-driven Dialog is removed.

## 4. `refactor(ui): replace sheets with a responsive dialog`

**Depends on:** Issues 1 and 3.

**Outcome:** Form surfaces use Base UI Drawer on touch devices and Dialog on desktop without losing in-progress input.

**Scope:** Generate the shadcn Drawer, add a compound `ResponsiveDialog`, freeze its selected presentation while open, and migrate Add Card, New Deck, API Key creation and Move Card; preserve swipe dismissal, safe-area spacing, scrolling and software-keyboard behavior.

**Acceptance:** Resizing or changing input capability while open does not remount the form, phone drawers and desktop dialogs pass the affected journeys, and Vaul plus the old Sheet API are removed.

## 5. `refactor(forms): replace the select primitive`

**Depends on:** Issues 1 and 4.

**Outcome:** Short predefined choices use the shadcn Select compound API.

**Scope:** Add trigger, value, content, group, label, item and separator parts; migrate deck and application-language selection; preserve null values, localized labels, form naming, invalid and disabled states, keyboard navigation and popup positioning inside responsive surfaces.

**Acceptance:** Every Select caller uses compound parts, selection works in Chromium and WebKit with keyboard and pointer input, and the old Select facade is removed.

## 6. `refactor(forms): replace the combobox primitive`

**Depends on:** Issues 1 and 4.

**Outcome:** Searchable choices use the shadcn Combobox compound API while language-specific custom entry stays outside the generic primitive.

**Scope:** Add input, content, empty, list, item, group and separator parts; migrate LanguageField and development controls; implement the valid unknown BCP 47 option inside LanguageField; preserve clear selection, hints, localization, long-list scrolling and invalid and disabled states.

**Acceptance:** Search, active-item movement, Enter, Escape, Tab, pointer selection and custom valid language tags work; invalid free text is not accepted; the combined legacy picker and unused helpers are removed.

## 7. `refactor(ui): replace the tooltip hook`

**Depends on:** Issue 1.

**Outcome:** Tooltips use one Base UI provider and compound trigger and content parts.

**Scope:** Add the provider at the client root, migrate IconButton and design tooling, preserve delayed hover, immediate keyboard focus, warm handoff between adjacent tooltips and suppression while a menu is open.

**Acceptance:** Tooltip text never substitutes for the trigger's accessible name, touch users do not depend on tooltip content, Escape and blur close correctly, and the custom hook and timer state are removed.

## 8. `refactor(ui): replace local toasts with Base UI Toast`

**Depends on:** Issue 1.

**Outcome:** Feedback and Undo use one application-level toast renderer and manager.

**Scope:** Add the Toaster at the client root, migrate current callers to `toast.add`, support one action and required status variants, preserve Lymi styling and prevent dismissal while the learner is interacting with the toast.

**Acceptance:** Toasts announce once, remain keyboard reachable, pause or remain actionable as required, dismiss cleanly, never become a notification stack by default, and the custom local timer implementation is removed.

## 9. `refactor(forms): establish compound fields and text controls`

**Depends on:** Issues 1, 5 and 6.

**Outcome:** Text-entry forms share one compound, accessible Field vocabulary that remains independent of form-state libraries.

**Scope:** Add Field, label, description, error, set, legend, group and content parts plus Input, Textarea and Native Select; provide an optional thin convenience composite; forward refs and native props; migrate current forms without changing their Zod submission validation or localized messages.

**Acceptance:** Labels, descriptions and errors are associated correctly, `data-invalid` and `aria-invalid` agree, first-invalid focus still works, iOS text remains at least 16 px, and the old prop-driven Field API is removed.

## 10. `refactor(forms): establish checkbox, radio and switch primitives`

**Depends on:** Issues 1 and 9.

**Outcome:** Binary and exclusive form choices use Base UI-backed shadcn compounds with native form compatibility.

**Scope:** Add Checkbox, Radio Group and Switch; migrate notification, consent and direction controls where the generic primitive fits; preserve labels, descriptions, disabled states, 44 px touch targets and immediate-save behavior in product components.

**Acceptance:** Every control supports `name`, current value, change, blur, disabled, required, invalid and ref contracts; keyboard and screen-reader semantics remain correct; superseded generic implementations are removed.

## 11. `refactor(forms): build toggle groups beneath segmented controls`

**Depends on:** Issues 1 and 9.

**Outcome:** Mutually exclusive compact choices use a reusable Toggle Group foundation while Segmented remains a Lymi presentation component.

**Scope:** Add Toggle Group and Toggle Group Item, rebuild Segmented on those parts, and migrate its callers without moving DirectionCompact, GoalPicker or other product meaning into the primitive.

**Acceptance:** Single selection, keyboard navigation, disabled state, focus treatment, moving indicator and reduced-motion alternative work; selection remains form-library compatible and generic toggle behavior has one source.
