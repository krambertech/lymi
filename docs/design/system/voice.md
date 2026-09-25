# Voice

Plain and friendly. The interface counts cards, not points, never nags and never celebrates for you: "You’re done for today", not "Congratulations!". The words for things are in [CONTEXT.md](../../../CONTEXT.md), and the process for changing any learner-facing string is the `ux-copy` skill.

- A field error says how to fix it: "Keep the term under 500 characters."
- Any other error says "Couldn't [verb] [thing]." and then the fix, never a status code: "Couldn't save the reminder. Check your connection and try again."
- "New deck" opens the form; "Create deck" submits it.
- Confirmation stays only where there is nothing to undo. The destructive button names the consequence ("Revoke key") and the safe button names what stays ("Keep key").
- Screen names (Library, Settings, Activity) and grade names (Forgot, Hard, Good, Easy) keep their capitals inside a sentence.
- Reminders and other notifications carry no guilt and no urgency.
- An empty state names what is missing and how to fill it: "No cards in Estonian A2 yet", not "Nothing here".
- A toast says what just happened and quotes at most 60 characters of a learner's text, cut at a word.
- Anything the AI wrote carries its badge where it appears, and nothing else is marked, so the label is a fact about one field rather than a disclaimer about the card.
- Curly quotes and the ellipsis character: “ ” ’ …
