---
name: review-ui
description: Review Lymi UI changes for intended behavior, interaction and accessibility, relevant responsive, theme, and state coverage, visual-system fit, motion, and evidenced component or performance risk. Use for a frontend diff, pull request, component, screen, or flow that affects what a learner sees or does. Skip backend, data, tooling, and documentation changes with no interface effect.
---

# Review Lymi UI

Produce one evidence-led review of the requested change. Reviews are read-only unless the user separately asks to implement fixes.

## Resolve scope

1. Read the issue, brief, or stated behavior and the actual diff. Use the exact requested comparison; for working-tree changes, inspect staged and unstaged work. Label any intent inferred from repository evidence.
2. Identify the affected learner flow, surfaces, and states. Trace shared code only far enough to understand consequences of this change.
3. Exit when the change cannot affect rendered UI, learner-facing language, or interaction. For mixed changes, review only the interface-affecting slice here.
4. Distinguish problems introduced or exposed by the change from unrelated pre-existing problems. Pre-existing issues do not affect the verdict.

Choose the smallest review that can give reliable confidence:

- Keep a local copy, token, icon, or spacing review narrow.
- Give a new or changed flow, form, navigation pattern, responsive layout, shared component, theme treatment, or animated interaction enough path and rendered coverage to test its important risks.
- Escalate into broad accessibility or performance investigation only when the change or observed behavior warrants it.

## Ground the review

Always read [`AGENTS.md`](../../../AGENTS.md), [`PRODUCT.md`](../../../PRODUCT.md), [`DESIGN.md`](../../../DESIGN.md), the stated intent, the diff, and the affected implementation. `DESIGN.md` owns Lymi's visual and interaction rules; cite it instead of restating it here.

Read [`CONTEXT.md`](../../../CONTEXT.md) when names or learner-facing language change. Follow the repository's architecture, testing, accepted decisions, and current surface brief only where they bear on the change; exploratory material is context, not a requirement.

Inspect nearby Lymi components and comparable flows before recommending a new pattern. Prefer a smaller change, native behavior, or an existing Lymi component or token before a new abstraction.

## Require appropriate evidence

**Code evidence** includes the diff, affected source, call sites, tests, semantics, and configuration. It can establish static problems and systemic causes.

**Rendered evidence** is the running interface in a stated viewport, theme, state, and input method. Inspect it whenever appearance, interaction, responsive behavior, focus, or motion determines the judgment. Code cannot prove the rendered result, and a screenshot cannot prove behavior or semantics.

Treat runtime-dependent concerns as unverified until observed. Put checks that could not be run under **Verification**, not in manufactured findings. Compare with the base behavior when responsibility is unclear.

## Route by demonstrated risk

Within the selected scope, judge in this order: intended flow; interaction and accessibility; relevant phone, desktop, theme, and interface states; Lymi's visual system and voice; motion; components and rendering; final polish.

Read only the guidance the change calls for:

- Controls, forms, navigation, or task behavior: [`references/interaction-and-accessibility.md`](references/interaction-and-accessibility.md)
- Layout, responsive behavior, themes, async data, or conditional states: [`references/responsive-themes-and-states.md`](references/responsive-themes-and-states.md)
- Hierarchy, typography, color, surfaces, voice, or motion: [`references/visual-system-and-motion.md`](references/visual-system-and-motion.md)
- Shared components or plausible rendering and performance risk: [`references/performance-and-components.md`](references/performance-and-components.md)
- Final report: [`references/report-format.md`](references/report-format.md)

Stop when later concerns are irrelevant. Consider polish only after the intended flow, important interaction and accessibility, and relevant environments and states pass.

## Conclude

- **Critical:** blocks or corrupts the intended task, risks data loss, materially misleads the learner, creates a serious accessibility barrier on the affected path, or makes necessary content or controls unreachable.
- **Major:** meaningfully regresses an important interaction, comprehension, responsive or theme behavior, state handling, maintainability, or measured performance.
- **Minor:** a localized, observable Lymi-system or finish regression worth fixing in this change. Preferences and optional nits are not findings.

Use **Blocked** for a Critical finding or when release-critical behavior cannot be judged with sufficient evidence; **Changes needed** for remaining introduced findings; and **Ship it** when no actionable introduced finding remains and coverage is sufficient for the change's risk.

Return one report with **Verdict**, **Findings**, **Coverage**, and **Verification**. Consolidate symptoms under their systemic cause. Every finding needs an exact location, evidence, learner impact, and a practical fix.

Do not edit files or change repository or external state during a review unless the user separately authorizes it.
