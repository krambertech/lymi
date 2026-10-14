# What counts as a finding

Read the section for each coverage branch the diff took. Each section names what to look for and the evidence a finding needs.

## Flow

Walk the shortest complete path from the stated intent: entry, action, feedback, outcome, and the recovery the change touches. Exercise alternate, failure, reopen, or resume paths only when the diff changes their code.

A finding is an observed failure on that path: an action that is missing or unclear, runs twice, gives false feedback, loses input, shows stale state, or leaves the outcome unreachable. Record the route, state, input method, and what happened.

## Interaction and accessibility

For a custom control, establish its accessible name, role, state, keyboard behavior, and focus behavior from source, then confirm in the running app. A native button, link, or dialog that already expresses the behavior needs only the rendered check.

Check what the diff can alter: tab order, visible focus, overlay focus trap and return, touch target size, form labels and errors, live announcements, reading order, and meaning carried only by colour or motion. `DESIGN.md` holds Lymi's exact sizes. An automated checker supports a finding but cannot establish keyboard, focus, or screen-reader behavior alone.

Cite the exact element and the missing or wrong behavior. Report a shared root cause once and list only the usages you confirmed.

## Responsive, theme, and state

Judge the rendered composition, reading order, and wrapping, never the responsive classes. Use the longest realistic content the field allows when it can change wrapping or push a control off screen; the `long` persona has it.

For each state the diff's code can enter, check that the task stays understandable, feedback stays true, recovery works, and the learner's input survives.

Report a breakpoint or token only when it produces an observed failure or breaks a rule in `DESIGN.md` or the system file it indexes. Record the route or component, viewport, theme, state, and input method, and merge combinations that share one cause.

## Visual system and voice

A visual finding needs one of: a contradiction with a named rule in `DESIGN.md` or `docs/design/system`, hierarchy that hides the task or state, equivalent elements that behave differently, content that becomes unreadable, or a one-off treatment that forks an established pattern. A preference for another density, radius, phrase, or composition is not a finding, because the review judges against Lymi's committed system, not taste.

Report wording only when it harms meaning, recovery, trust, or consistency with `CONTEXT.md` and nearby copy. Check polish only after the flow, interaction, and coverage cells pass.

## Motion

Name what the motion tells the learner. If it tells nothing about state, space, or continuity, the finding is that it should not animate. Check that the reduced-motion variant still shows the state change. For a view transition, verify the navigation direction, the untyped fallback, and reduced motion; an animation firing is not proof it is right.

Record the trigger and the normal and reduced-motion outcomes. Measure timing only when the finding depends on a number.

## Components and performance

Read this section only when the diff changes a shared component, list rendering, assets, loading boundaries, or repeated animation work.

For a shared component, read its call sites and the contract they rely on. A maintainability finding needs a concrete invalid state, lost capability, duplicated ownership, or a call site the diff breaks. Preferring a different API is not evidence.

Source can establish unbounded render work, missing cleanup, duplicated requests, avoidable layout shift, or animation of layout properties. Claim jank, slow response, or a metric regression only after measuring it, with the environment, action, data size, and result. Recommend memoization, virtualization, a dependency, or a cache only for a measured problem, because each adds code to maintain.

## The phone app

Read this section only when the diff touches `apps/mobile`. [phone.md](../../../../docs/design/system/phone.md) owns the rules; these are the ones a review most often finds broken.

- A screen sets no inset of its own for a sheet's or a page's text: a sheet's intro is `Sheet`'s `description` and a page's is `Screen`'s, so a `Text` with `px-1` or `-mt-1` at the top of either is a finding.
- A sheet that saves uses `save` (close, centred title, amber ✓). A full-width button under a field, or a second commit such as the number pad's Done beside a Save, is a finding.
- Commands from a button are `ActionMenu`; a sheet of command rows from a ⋯ is a finding. A choice that needs a second line, a long list, a search, or editing stays a sheet.
- A sheet never swaps its content for a second level, and a part-height sheet never opens another sheet over itself; both make iOS jump or hide it.
- A change of what a control holds moves smoothly: two components swapped for one state (a button that becomes a capsule) need a shared element or an entering animation from a `@lymi/design` preset.
- Order changes by a handle, never Move up and Move down rows.
- A layout fix proved in the Simulator, not in code: a `formSheet` route's header beside its scroll view needs `collapsable={false}`, and a multi-line field needs `MULTILINE`.
