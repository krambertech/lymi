import { Doc, Sub } from "./frame";

const PAIRS: [string, string, string][] = [
  ["End of session", "That’s the lot", "Congratulations! You did it! 🎉"],
  ["Nothing due", "Nothing due · Coming up: 31 cards tomorrow", "You’re all caught up!"],
  ["Empty deck", "Empty deck. Add the first card from your lesson.", "No cards found."],
  ["Archive", "Archived “sbrigarsi” · Undo", "Are you sure you want to delete this card?"],
  ["Primary action", "Review 11 due", "Start learning"],
  ["Field error", "Keep it under 200 characters.", "Invalid input"],
  ["Load error", "Couldn’t load your cards. Check your connection and try again.", "Error 500"],
  ["Revoke", "Keep key · Revoke key", "Cancel · OK"],
  ["AI label", "AI meaning", "✨ Magic suggestion"],
  ["Count", "11 due · Lesson 14 and Portuguese", "You have 11 cards to review today! 🔥"],
  [
    "Reminder",
    "11 cards are waiting when you have a moment.",
    "You haven’t reviewed today. Don’t fall behind!",
  ],
];

export function Voice() {
  return (
    <Doc
      title="Voice"
      lede="Plain and friendly. It counts cards, not points. It never nags and never celebrates for you. Undo replaces confirmation wherever it can. Anything the AI wrote says so."
    >
      <Sub title="Rules">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Sentence case everywhere. Title Case only for proper nouns.",
            "Say what happens: a button reads “Review 11 due” or “Add to Lesson 14”, a toast reads Archived “sbrigarsi”. Not “Submit”, “OK”, “Start”.",
            "No exclamation marks in the interface. No emoji.",
            "Field errors say how to fix it: “Keep it under 200 characters.” Not “Invalid input”.",
            "Other errors say “Couldn’t [verb] [thing].” and then the fix. Never a status code.",
            "“New deck” opens the form. “Create deck” submits it.",
            "Confirm only what has no undo. The destructive button names the consequence, “Revoke key”, and the safe one names what stays, “Keep key”.",
            "Screen names and grade names keep their capitals inside a sentence: “Restore it from Archived”, “Grade it Hard”.",
            "Reminders and other notifications carry no guilt and no urgency.",
            "Anything generated is labelled where it appears: “AI meaning”, “AI example”. The label is a chip, not a sparkle.",
            "Keyboard hints are part of the copy on desktop: the button says “Review 11 due” and shows R.",
            "Curly quotes and the ellipsis character in rendered text.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
      <Sub title="Say, don’t say">
        <div className="edge overflow-hidden rounded-lg bg-plate">
          <div className="hidden grid-cols-[120px_1fr_1fr] gap-4 border-b border-edge px-5 py-2 text-xs font-medium text-muted @3xl:grid">
            <span>Where</span>
            <span>Lymi says</span>
            <span>Not</span>
          </div>
          {PAIRS.map(([where, yes, no]) => (
            <div
              key={where}
              className="grid grid-cols-[minmax(0,1fr)] gap-1 border-b border-edge px-5 py-3 text-base last:border-b-0 @3xl:grid-cols-[120px_1fr_1fr] @3xl:gap-4"
            >
              <span className="text-sm text-muted">{where}</span>
              <span className="text-text">{yes}</span>
              <span className="text-muted line-through decoration-muted">{no}</span>
            </div>
          ))}
        </div>
      </Sub>
    </Doc>
  );
}
