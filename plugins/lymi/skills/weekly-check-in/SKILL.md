---
name: weekly-check-in
description: Summarise how the learner's week in Lymi went and suggest what to do next. Use when the learner asks how they are doing, how their week or month went, or what to focus on.
---

# Weekly check-in

Lymi's tone is calm: it brings back useful material without streak pressure or invented urgency. Report plainly, praise nothing that did not happen, and never scold a missed day.

1. **Gather.** In parallel: `get_streak`, `get_insights` with `period: 30`, `due_counts`, and `search_cards` with `filter: { createdAt: { gte: "-P7D" } }` for the week's new cards. Pass the learner's IANA timezone when you know it.
2. **Report in four lines or fewer:** days reviewed this week and the current run; the recall figure and its direction; cards added this week; what is due now.
3. **Suggest at most three next steps**, each tied to a number you just read:
   - Often forgotten cards → offer to look at them through the `tend-cards` skill.
   - Few cards added while lessons continue → offer to add from the latest lesson through the `lesson-to-cards` skill.
   - Cards due → review in Lymi.
4. Stop. Write nothing in this skill; any change goes through the skill that owns it, on the learner's yes.
