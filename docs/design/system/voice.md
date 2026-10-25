# Voice

Plain and friendly. The interface counts cards, not points, never nags and never celebrates for you: "You’re done for today", not "Congratulations!". The words for things are in [CONTEXT.md](../../../CONTEXT.md), and the process for changing any learner-facing string is the `ux-copy` skill.

- A field error says how to fix it: "Keep the term under 500 characters."
- An error names what failed and how to recover, through its text or a nearby action. State a known cause; keep status codes out of copy. "Couldn’t save the reminder. Check your connection and try again."
- "New deck" opens the form; "Create deck" submits it.
- A question's destructive button names the consequence ("Revoke key") and its safe button names what stays ("Keep key").
- Screen names (Library, Settings, Activity) and grade names (Forgot, Hard, Good, Easy) keep their capitals inside a sentence.
- Reminders and other notifications carry no guilt and no urgency.
- An empty state names what is missing and how to fill it: "No cards in Estonian A2 yet", not "Nothing here".
- A toast says what just happened; how much of a learner's text it quotes is in [overlays.md](overlays.md#toasts).
- On card pages and forms, mark fields written by Lymi’s enrichment with the AI badge. Review omits these badges. Text supplied by a connected assistant is recorded as manual, with the app named in Activity.
- Curly quotes and the ellipsis character: “ ” ’ …, never straight quotes or three dots.
