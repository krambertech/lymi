---
name: ux-copy
description: Write or revise Lymi's learner-facing interface text. Use whenever a product change adds or changes controls, instructions, states, notifications, accessibility names, or localized messages; review English, Ukrainian, and Russian.
---

# Write Lymi UX copy

Every string should make sense on the first read. Lymi sounds warm, calm and quick.

## Ground the copy

- Read the affected behavior in [`PRODUCT.md`](../../../PRODUCT.md), the product terms and avoid-list in [`CONTEXT.md`](../../../CONTEXT.md), the Voice section of [`DESIGN.md`](../../../DESIGN.md), and the nearby interface copy.
- Describe only behavior the product supports. Name the learner's task, not the system behind it.

## Write plainly

- Use familiar words, one idea per sentence, and one term for the same thing throughout a flow.
- Keep labels short. Start action labels with the specific verb that names what will happen.
- Use sentence case and a calm, direct tone. Leave out idioms, hype, guilt, celebration, exclamation marks, and decorative AI language.
- Count cards, not words or points. Label AI-written content where it appears.
- Make errors say what happened and what the learner can do next. Make empty states explain the state and offer one useful next action.
- Give every field a visible label and every icon-only action a clear accessible name.

## Check every language

- English is the source message. Mark a complete thought for localization; never assemble sentences from fragments around a value.
- Follow [the translation skill](../translate/SKILL.md) for every changed message, then read the English, Ukrainian and Russian in the affected interface and state.
- Check a narrow phone and desktop width for meaning, wrapping, overflow and truncation. Give a natural translation enough room; adjust the layout or simplify the source idea instead of forcing awkward wording to fit.
- Mark uncertain wording as needing native review; do not report that language as verified.

## Finish

- The copy is ready when all three languages preserve the same meaning and action, every affected state was checked, and no translation uncertainty is hidden.
- Hand off the languages and states checked, any visual check that was skipped, and every translation still needing review.
