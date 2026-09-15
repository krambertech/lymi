# Architecture decision records

One file per decision that is hard to reverse, surprising without context, and the result of a real trade-off. Everything else lives in [stack.md](../stack.md). Vocabulary lives in [CONTEXT.md](../../CONTEXT.md).

## Writing an ADR

Use an ADR for one consequential decision that is accepted or ready for explicit approval. `proposed` means approval is pending; open-ended exploration belongs in [`docs/proposals`](../proposals/README.md).

- Title the ADR as the decision, not the topic.
- Include `status` and `date` in frontmatter; add `supersedes` only when applicable.
- State the decision in the opening paragraph. Keep `Context` to the facts and constraints that made a decision necessary.
- List only real alternatives under `Considered options`, with one short reason each was accepted, rejected, or deferred.
- Record material benefits, costs, constraints, and required follow-ups under `Consequences`; do not turn them into an implementation sequence.
- Link research, the proposal, and the tracking issue instead of copying them. Omit chronology, tutorials, code walkthroughs, and repeated rationale.

Aim for 300–700 words. Exceed that only when compression would hide a material security, data, migration, or operational consequence.

Name a new ADR with the next available number only after rebasing on the current default branch. If two branches still choose the same number, renumber the later ADR before merging. Do not maintain a hand-written index here; the folder listing is the index and each ADR carries its own status.
