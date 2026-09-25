---
name: review-ui
description: Review Lymi UI changes for intended behavior, interaction and accessibility, relevant responsive, theme, and state coverage, visual-system fit, motion, and evidenced component or performance risk. Use for a frontend diff, pull request, component, screen, or flow that affects what a learner sees or does. Skip backend, data, tooling, and documentation changes with no interface effect.
---

# Review Lymi UI

Produce one evidence-led review of the requested change. A review is read-only: edit files or change repository or external state only when the user separately asks for fixes.

## Resolve scope

1. Read the issue, brief, or stated behavior and the actual diff. Use the exact requested comparison; for working-tree changes, inspect staged and unstaged work. Label any intent you inferred from repository evidence.
2. Name the affected learner flow, surfaces, and states. Trace shared code only as far as the call sites this change alters.
3. Exit when the change cannot affect rendered UI, learner-facing language, or interaction. For a mixed change, review only the interface slice.
4. Separate problems the change introduced or exposed from pre-existing ones. Pre-existing problems never affect the verdict.

## Ground the review

Read [`PRODUCT.md`](../../../PRODUCT.md), [`DESIGN.md`](../../../DESIGN.md), the stated intent, the diff, and the affected implementation. Add [`CONTEXT.md`](../../../CONTEXT.md) when names or learner-facing text change. `DESIGN.md` and the files it indexes in `docs/design/system` own Lymi's visual and interaction rules; cite the rule instead of restating it.

Before recommending a new pattern, find the nearest shipped Lymi component or flow that does the same job. Recommend reusing it unless the diff shows why it cannot work.

## Choose the coverage

Walk this tree once per diff and take every branch that matches. The union is the coverage; nothing outside it is required.

```
Always                                                → the changed flow at 393 px, light theme, touch
Diff touches colour, tokens, surfaces, borders,
  icons, images, or focus styles?                     → add dark theme
Diff touches layout, spacing, the shell, or a
  component used on both phone and desktop?           → add 1280 px with a pointer
Diff touches the shell, rail, top bar, or back row?   → add 768 px, where the rail appears
Diff touches a drawer, dialog, menu, popover,
  or form?                                            → add keyboard: open, move, submit, Escape, focus return
Diff adds or changes an animation or transition?      → add reduced motion
Diff adds or changes learner-facing text?             → add Ukrainian at 393 px
Diff touches loading, empty, error, offline,
  or pending code paths?                              → add each state the code can enter
```

The reasons: 393 px is the phone Lymi is designed on, so it is always the first cell. Dark is a separate warm palette, not an inversion, so a colour change can pass in light and fail in dark. Ukrainian runs longer than English and wraps first. The drawer and dialog swap at the desktop breakpoint, so an overlay change needs both widths.

## Collect evidence

**Code evidence** is the diff, affected source, call sites, tests, semantics, and configuration. It establishes static problems and systemic causes.

**Rendered evidence** is the running interface in a stated viewport, theme, state, and input method. Every coverage cell needs rendered evidence. Code cannot prove the rendered result, and a screenshot cannot prove behavior or semantics.

A concern you could not observe goes under **Verification**, never under **Findings**. When it is unclear whether the change caused a problem, compare with the base branch.

For what counts as a finding in each area, read [`references/checks.md`](references/checks.md).

## Conclude

- **Critical:** blocks or corrupts the intended task, risks data loss, materially misleads the learner, creates a serious accessibility barrier on the affected path, or makes necessary content or controls unreachable.
- **Major:** meaningfully regresses an important interaction, comprehension, responsive or theme behavior, state handling, maintainability, or measured performance.
- **Minor:** a localized, observable Lymi-system or finish regression worth fixing in this change. Preferences and optional nits are not findings.

Use **Blocked** for a Critical finding or when a coverage cell on the release path could not be observed; **Changes needed** for any other introduced finding; and **Ship it** when no introduced finding remains and every coverage cell was observed.

Return one report in [`references/report-format.md`](references/report-format.md). Consolidate symptoms under their systemic cause. Every finding needs an exact location, evidence, learner impact, and a fix.
