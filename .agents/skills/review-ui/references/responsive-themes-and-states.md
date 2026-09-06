# Responsive, themes, and states

Use this guidance when the change can alter layout, responsive composition, theme rendering, async data, or a conditional interface state. Choose the smallest coverage matrix capable of exposing a regression in the changed behavior.

## Coverage

For a substantial flow or shell change, inspect the affected path in the phone and desktop contexts it must support. Add theme, intermediate-size, zoom or text-resize, standalone-PWA, and safe-area coverage when the implementation or intended behavior makes those dimensions risky.

For a local change, inspect the affected environment and only the additional combinations where the same implementation could plausibly differ. Record what was inspected and name relevant combinations that were not.

## What to judge

Inspect the rendered composition, content, DOM and reading order rather than treating responsive classes as proof. Use realistic long content when it can affect wrapping or reachability. Report a breakpoint or token only when it produces a concrete failure or contradicts an owning Lymi rule.

Inspect both themes when color, tokens, surfaces, borders, assets, focus, status, or theme behavior change. Otherwise one theme can be enough when the other uses the same confirmed path; state that it was not inspected.

Select states from what the affected code can enter, such as loading, empty, error, pending, success, disabled, offline, long content, reopened, restored, or retried. These are prompts, not a checklist. Judge whether relevant transitions keep the task understandable, feedback truthful, recovery possible, and learner work intact.

When client data, offline behavior, server rendering, or hydration changes, follow the owning repository documents before choosing checks.

## Evidence

Record the failing route or component, viewport, theme, state, and input method that matter to the claim. Consolidate combinations that share one token, component, or layout cause.
