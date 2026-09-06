---
name: shape-feature
description: Shape an ambiguous Lymi feature before implementation. Use when the desired outcome, behavior, or scope still needs decisions; skip decided implementation, bug diagnosis, code review, and pull-request work.
---

# Shape a feature

Turn a rough idea into a clear next artifact without implementing it. Follow [`AGENTS.md`](../../../AGENTS.md) for product invariants, owning sources, and permissions.

## Ground the idea

- Read the relevant owning sources and search current code, docs, and issues before asking something the repository already answers.
- Restate the learner outcome and what observable result would make it successful.
- Separate confirmed facts, assumptions, and open decisions. Keep unrequested research notes out of tracked artifacts.

## Grill the idea

Run a short decision interview. Grill the idea, not the user.

- Start with the unknown most likely to change or eliminate the work.
- Ask one focused question at a time. Offer concrete options when useful, recommend one, and explain the trade-off.
- Probe second-order effects only when they could change the outcome, a product invariant, a public contract, the smallest coherent slice, or its acceptance evidence.
- Track what is decided, assumed, and still open.
- When the user delegates a reversible choice, choose the smallest reasonable default. Return irreversible or high-risk choices to the user.

Stop when the outcome, boundaries, smallest vertical slice, and acceptance evidence are clear. If a necessary decision remains unresolved, name it precisely.

## Route the result

- Use a **ready issue** when the behavior is decided and one vertical slice fits one focused pull request. Include the outcome, boundaries, acceptance evidence, relevant risks, and verification path.
- Use `docs/proposals/` when the direction remains optional or unresolved.
- Use `docs/plans/` when the direction is accepted but delivery needs several independently verifiable slices.
- Use an ADR only for an accepted decision that is consequential and hard to reverse.

Return the decisions, assumptions, remaining questions, recommended artifact, and next action. Add a compact handoff when the user wants to continue in a fresh session.

Draft in chat by default. Create or change an artifact only when asked, and finish shaping before beginning any requested implementation.
