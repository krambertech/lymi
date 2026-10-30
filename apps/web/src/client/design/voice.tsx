import { Button } from "../components/button";
import { FieldError } from "../components/ui/field";
import { Rule, Rules, Verdict } from "./do-dont";
import { Doc, Sub } from "./frame";

const PAIRS: [string, string, string][] = [
  ["End of session", "You’re done for today", "Congratulations! You did it! 🎉"],
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
    "11 cards to review · Review whenever you have a moment.",
    "You haven’t reviewed today. Don’t fall behind!",
  ],
];

const RULES = [
  "Sentence case everywhere. Title Case only for proper nouns.",
  "Say what happens: “Review 11 due”, “Add to Lesson 14”. Not “Submit”, “OK”, “Start”.",
  "No exclamation marks and no emoji in the interface.",
  "A field error says how to fix it: “Keep it under 200 characters.”",
  "Other errors say “Couldn’t [verb] [thing].” and then the fix. Never a status code.",
  "“New deck” opens the form. “Create deck” submits it.",
  "Confirm only what has no Undo. The destructive button names the consequence, “Revoke key”; the safe one names what stays, “Keep key”.",
  "Screen and grade names keep their capitals in a sentence: “Restore it from Archived”, “Grade it Hard”.",
  "Reminders carry no guilt and no urgency.",
  "Anything the AI wrote is labelled where it shows: “AI meaning”. The label is a chip, not a sparkle.",
  "On a desktop the key is part of the copy: the button says “Review 11 due” and shows R.",
  "Curly quotes and the ellipsis character in rendered text.",
];

export function Voice() {
  return (
    <Doc
      title="Voice"
      lede="Plain and friendly. Lymi counts cards, not points. It never nags and never celebrates for you. Undo replaces confirmation wherever it can, and anything the AI wrote says so."
    >
      <Sub
        title="Do and don’t"
        note="The words we use, like card and archive, come from CONTEXT.md."
      >
        <Rules>
          <Rule kind="do" title="Do it, then offer Undo.">
            <ToastLike action="Undo">Archived “sbrigarsi”</ToastLike>
          </Rule>
          <Rule
            kind="dont"
            title="Ask “Are you sure?” when it can be undone."
            note="People learn to click through it without reading."
          >
            <div className="edge grid w-full max-w-72 gap-4 rounded-xl bg-plate p-5">
              <p className="text-base font-medium">Are you sure you want to delete this card?</p>
              <div className="flex justify-end gap-2">
                <Button size="sm">Cancel</Button>
                <Button size="sm" variant="primary">
                  OK
                </Button>
              </div>
            </div>
          </Rule>
          <Rule kind="do" title="Say exactly what the button does.">
            <Button variant="primary" kbd="R">
              Review 11 due
            </Button>
          </Rule>
          <Rule kind="dont" title="Use a vague label.">
            <Button variant="primary">Start learning</Button>
          </Rule>
          <Rule kind="do" title="Say how to fix the error.">
            <FieldError role="none">Keep it under 200 characters.</FieldError>
          </Rule>
          <Rule kind="dont" title="Only say that something is wrong.">
            <FieldError role="none">Invalid input</FieldError>
          </Rule>
          <Rule kind="do" title="Say what happened, calmly.">
            <Message>You’re done for today</Message>
          </Rule>
          <Rule kind="dont" title="Celebrate with exclamation marks." note="No emoji or fanfare.">
            <Message>Congratulations! You did it! 🎉</Message>
          </Rule>
        </Rules>
      </Sub>

      <Sub title="Rules">
        <ul className="grid gap-x-8 @3xl:grid-cols-2">
          {RULES.map((t) => (
            <li
              key={t}
              className="flex items-start gap-3 border-b border-edge py-3 text-base text-pretty text-ink-secondary"
            >
              <span className="mt-0.5 shrink-0">
                <Verdict kind="do" bare />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </Sub>

      <Sub title="Say, don’t say" note="The same moment, written two ways.">
        <div className="edge overflow-hidden rounded-lg bg-plate">
          <div className="hidden grid-cols-[120px_1fr_1fr] gap-4 border-b border-edge px-5 py-2.5 @3xl:grid">
            <span className="text-xs font-medium text-ink-muted">Where</span>
            <Verdict kind="do" />
            <Verdict kind="dont" />
          </div>
          {PAIRS.map(([where, yes, no]) => (
            <div
              key={where}
              className="grid grid-cols-[minmax(0,1fr)] gap-1.5 border-b border-edge px-5 py-3.5 text-base last:border-b-0 @3xl:grid-cols-[120px_1fr_1fr] @3xl:gap-4"
            >
              <span className="text-sm text-ink-muted">{where}</span>
              <span className="flex items-start gap-2 text-ink">
                <span className="mt-0.5 @3xl:hidden">
                  <Verdict kind="do" bare />
                </span>
                <span className="sr-only">Do: </span>
                {yes}
              </span>
              <span className="flex items-start gap-2 text-ink-muted">
                <span className="mt-0.5 @3xl:hidden">
                  <Verdict kind="dont" bare />
                </span>
                <span className="sr-only">Don’t: </span>
                {no}
              </span>
            </div>
          ))}
        </div>
      </Sub>
    </Doc>
  );
}

/** The toast's look: ink, with its action in the amber that reads on ink. */
function ToastLike({ action, children }: { action: string; children: string }) {
  return (
    <span className="inline-flex h-11 items-center gap-4 rounded-md bg-ink ps-5 pe-2 text-base text-canvas">
      {children}
      <span className="rounded-sm px-2.5 py-1.5 font-semibold text-toast-action">{action}</span>
    </span>
  );
}

function Message({ children }: { children: string }) {
  return <p className="text-xl font-medium">{children}</p>;
}
