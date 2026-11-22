---
name: shape-feature
description: Shape an ambiguous Lymi feature before implementation. Use when the desired outcome, behavior, scope, or look still needs decisions, including a choice between visual or interaction options; skip decided implementation, bug diagnosis, code review, and pull-request work.
---

# Shape a feature

Turn a rough idea into a clear next artifact without implementing it.

## Ground the idea

- Read the relevant owning sources and search current code, docs, and issues before asking something the repository already answers.
- Search open pull requests, remote branches, and worktrees for earlier work on the same thing. List each hit with its link and state, or the searches that found none.
- Name the existing field, component, or screen that could do the job, and why it cannot.
- Restate the learner outcome and what observable result would make it successful.
- Separate confirmed facts, assumptions, and open decisions.

## Shape through decisions

Hold a small decision tree privately. Start with the open decision most likely to change or eliminate the work, and recompute what remains after every answer.

Ask one question at a time, after the options exist when it is about [look or interaction](#show-a-look-or-interaction). Keep it on one screen and make most answers possible with one character:

```
**<the question, one line>**

a) <option>
b) <option>
c) <option>

Lean: b, <the reason in one clause>

4 settled, 3 open
```

- Offer two to four concrete options when the decision permits them, one of them the simplest that could work.
- State a lean even when confidence is low; name the uncertainty in one clause instead of adding a long preamble.
- Ask the user only for decisions that need their judgment; find facts in the repository or the available tools.
- Treat a delegated reversible choice as settled using the smallest default. Return irreversible or high-risk choices to the user.
- Probe a second-order effect only when it could change the outcome, a product invariant, a public contract, the smallest coherent slice, or its acceptance evidence.

Stop when the outcome, boundaries, smallest vertical slice, and acceptance evidence are clear, even if a template has empty fields. If a necessary decision remains unresolved, name it.

## Show a look or interaction

A choice about how something looks, moves, or is used is made from working options:

1. Build two to four structurally different options behind one switcher, including the simplest, from the product's real components and sample data. Build them without waiting to be asked and leave them uncommitted, under `apps/web/src/client/design` or in a private HTML page.
2. Compose one comparison image per width, 393 px and 1280 px, with every option labelled. Then ask the question, with your lean.
3. After each round, list what the new version removed or moved beyond what was asked. Restore each entry or get it approved before the next round.

## Route the result

- Use a **ready issue** when the behavior is decided and one vertical slice fits one focused pull request. Include the outcome, boundaries, acceptance evidence, relevant risks, verification path, and a link to the proposal when one exists.
- Use `docs/proposals/` when the direction remains optional or when an accepted direction needs several independently verifiable delivery slices.
- Use an ADR only for an accepted decision that is consequential and hard to reverse.

Return a concise summary of the decisions, assumptions, remaining questions, recommended artifact, and next action. Add a compact handoff when the user wants to continue in a fresh session.

Draft everything else in chat. Create or change a tracked file or issue only when asked, and finish shaping before beginning any requested implementation.

When the user asks to track a completed shape in GitHub, continue with [`create-issues`](../create-issues/SKILL.md).
