# Interaction and accessibility

Use this guidance when the change affects a task, control, form, navigation path, overlay, gesture, shortcut, or accessible behavior. Review the affected path, not the whole application.

## Intended flow

Derive the shortest complete path from the stated intent and Lymi's owning documents: entry, action, feedback, outcome, and any recovery that matters to the change. Walk it in the rendered app. Exercise alternate, failure, reopen, or resume behavior only when the changed code or promised experience makes it relevant.

Look for observable failures: an unavailable or unclear action, duplicate execution, misleading feedback, lost input, stale state, an unreachable outcome, or a recovery path that does not recover. Expand to other call sites only when shared code creates a plausible consequence there.

## Interaction and semantics

Prefer native buttons, links, controls, and dialogs when they express the behavior. For custom interaction, establish the accessible name, role, state, keyboard behavior, focus behavior, and pointer behavior from source and runtime evidence appropriate to the risk.

Exercise only the input methods the affected surface supports. Pay particular attention when the change can alter tab order, visible focus, overlay focus and dismissal, touch targets, form labels or errors, dynamic announcements, reading order, or information conveyed only by color or motion. Use `PRODUCT.md` and `DESIGN.md` for Lymi's exact requirements.

A screen-reader pass is useful when semantics, names, live updates, or a custom widget change. Automated checks can support the review but cannot establish keyboard, focus, or screen-reader behavior by themselves.

## Evidence

For source findings, cite the exact element and incorrect or missing behavior. For runtime findings, record the route, state, input method, and observed result. Report a shared root cause once and name only the affected usages you confirmed.
