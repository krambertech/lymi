import { Section, Sub } from "./Frame";

const PAIRS: [string, string, string][] = [
  ["End of session", "That’s the lot", "Congratulations! You did it! 🎉"],
  ["Nothing due", "Nothing due right now", "You’re all caught up!"],
  ["Empty deck", "Empty deck. Add the first word from your lesson.", "No cards found."],
  ["Archive", "Archived “sbrigarsi”  ·  Undo", "Are you sure you want to delete this card?"],
  ["Primary action", "Review 11 due", "Start learning"],
  ["Error", "Keep it under 200 characters.", "Invalid input"],
  ["AI label", "AI meaning", "✨ Magic suggestion"],
  ["Count", "11 cards due · Across 2 decks", "You have 11 cards to review today! 🔥 Day 14 streak"],
];

export function Voice() {
  return (
    <Section
      id="voice"
      title="Voice"
      lede="Plain and friendly. It counts cards, not points. It never nags and never celebrates for you. Undo replaces confirmation wherever it can. Anything the AI wrote says so."
    >
      <Sub title="Rules">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Sentence case everywhere. Title Case only for proper nouns.",
            "Say what happens: “Review 11 due”, “Add to Lesson 14”, “Archived ‘sbrigarsi’”. Not “Submit”, “OK”, “Start”.",
            "Numbers are counts of cards and days. Never points, streaks, XP or percentages.",
            "No exclamation marks in the interface. No emoji.",
            "Errors say how to fix it: “Keep it under 200 characters.” Not “Invalid input”.",
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
    </Section>
  );
}
