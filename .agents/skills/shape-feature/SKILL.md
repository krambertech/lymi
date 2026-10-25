---
name: shape-feature
description: Shape an ambiguous Lymi feature before implementation. Use when the desired outcome, behavior, or scope still needs decisions; skip decided implementation, bug diagnosis, code review, and pull-request work.
---

# Shape a feature

Turn a rough idea into a clear next artifact without implementing it.

## Ground the idea

- Read the relevant owning sources and search current code, docs, and issues before asking something the repository already answers.
- Restate the learner outcome and what observable result would make it successful.
- Separate confirmed facts, assumptions, and open decisions. Keep unrequested research notes out of tracked artifacts.

## Shape through decisions

Hold a small decision tree privately. Start with the open decision most likely to change or eliminate the work, and recompute what remains after every answer.

Ask exactly one question at a time. Keep it on one screen and make most answers possible with one character:

```
**<the question, one line>**

a) <option>
b) <option>
c) <option>

Lean: b, <the reason in one clause>

4 settled, 3 open
```

- Offer two to four concrete options when the decision permits them. For an open question with no fixed options, omit them but keep the lean and the progress count.
- State a lean even when confidence is low; name the uncertainty in one clause instead of adding a long preamble.
- Update the count after every answer. The number of open decisions may change as the shape becomes clearer.
- Ask the user only for decisions that need their judgment; find facts in the repository or the available tools.
- Treat a delegated reversible choice as settled using the smallest default. Return irreversible or high-risk choices to the user.
- Probe a second-order effect only when it could change the outcome, a product invariant, a public contract, the smallest coherent slice, or its acceptance evidence.

Stop when the outcome, boundaries, smallest vertical slice, and acceptance evidence are clear, even if a template has empty fields. If a necessary decision remains unresolved, name it.

## Route the result

- Use a **ready issue** when the behavior is decided and one vertical slice fits one focused pull request. Include the outcome, boundaries, acceptance evidence, relevant risks, verification path, and a link to the proposal when one exists.
- Use `docs/proposals/` when the direction remains optional or when an accepted direction needs several independently verifiable delivery slices.
- Use an ADR only for an accepted decision that is consequential and hard to reverse.

Return a concise summary of the decisions, assumptions, remaining questions, recommended artifact, and next action. Add a compact handoff when the user wants to continue in a fresh session.

Draft in chat by default. Create or change an artifact only when asked, and finish shaping before beginning any requested implementation.

When the user asks to track a completed shape in GitHub, continue with [`create-issues`](../create-issues/SKILL.md).
