# Proposals

A proposal keeps one product or technical direction worth discussing. It may include a delivery outline once accepted, but it is never the source of truth for current behavior.

Use the owning document for current truth: `PRODUCT.md`, `DESIGN.md`, `CONTEXT.md`, `docs/stack.md`, or `docs/data-model.md`. Use an [ADR](../adr/README.md) only for a consequential decision that is difficult to reverse. Use a GitHub issue to track active work without copying the proposal into it.

## Lifecycle

- `exploration`: interesting, but not approved.
- `accepted`: approved direction, not yet in active delivery.
- `in_progress`: accepted and being delivered.
- `implemented`: delivered; keep only when its rationale or rejected alternatives remain useful.
- `paused`: still valid, but deliberately not active.
- `declined`: considered and intentionally not planned.
- `superseded`: replaced by another proposal or decision.

Update the status as the direction changes. An accepted proposal may add a short `Delivery` section with ordered, independently useful slices. Once implementation is complete, move durable behavior into its owning document and either shorten the proposal to its lasting rationale or delete it; Git history keeps the implementation record.

## Writing a proposal

- Use frontmatter with `status`, `date`, and a short `decision`; use `decision: none` while exploring.
- Lead with the learner or system outcome and say what is not decided.
- Separate confirmed evidence, hypotheses, and the current leaning. Date external facts that may change.
- Keep only alternatives, boundaries, and open questions that could change the decision.
- After acceptance, add only enough delivery detail to define safe slices and completion. Put execution state in the linked issue or pull request.
- Link to the current source of truth instead of repeating it.

Aim for fewer than 1,000 words. Do not maintain a hand-written index here; the folder listing is the index.
