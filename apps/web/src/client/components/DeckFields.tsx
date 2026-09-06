import type { Directions } from "@lymi/core";
import { clsx } from "clsx";
import { useId } from "react";
import { Combobox } from "./Combobox";
import { Field } from "./Field";
import { Segmented } from "./Segmented";

/**
 * The two settings a deck carries besides its name, shared by the create sheet and the deck
 * settings screen so the same choice looks the same in both places.
 */

/** Languages offered by name. Any other BCP 47 tag can still be typed in. */
const TAGS = [
  "ar",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
];

let names: Intl.DisplayNames | null | undefined;
/** "it" reads as Italian. Falls back to the tag where the browser has no name for it. */
export function languageName(tag: string): string {
  if (names === undefined) {
    try {
      names = new Intl.DisplayNames(["en"], { type: "language" });
    } catch {
      names = null;
    }
  }
  try {
    return names?.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

const OPTIONS = TAGS.map((tag) => ({ value: tag, label: languageName(tag), hint: tag })).sort(
  (a, b) => a.label.localeCompare(b.label),
);

/** Loose BCP 47, the same shape the API accepts. */
const TAG_RE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;

interface LanguageProps {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
}

/**
 * Forty languages is a list you search, not a list you scroll: the box becomes a search
 * field and the names filter as you type. The tag rides along on each row, because the tag
 * is what tells Portuguese from Brazilian Portuguese and it is what the API stores. A tag
 * the list has never heard of is still reachable — type it and it becomes the last row.
 */
export function LanguageField({
  value,
  onChange,
  label = "Language",
  hint = "The language the words are in. It fills in on every new card.",
  error,
}: LanguageProps) {
  // A tag chosen by hand belongs in the list too, so it reads by name and shows as selected.
  const options =
    value && !TAGS.includes(value)
      ? [...OPTIONS, { value, label: languageName(value), hint: value }]
      : OPTIONS;
  return (
    <Field label={label} hint={hint} error={error}>
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        clearLabel="No language"
        searchLabel="Search languages"
        accept={(query) => (TAG_RE.test(query) ? query : null)}
        acceptLabel={(tag) => `Use “${tag}” as the tag`}
        emptyLabel="No language by that name. Type its tag to use it anyway."
      />
    </Field>
  );
}

interface DirectionOption {
  value: Directions;
  label: string;
  short: string;
  blurb: string;
}

export const DIRECTIONS: DirectionOption[] = [
  {
    value: "recognition",
    label: "Recognition",
    short: "Recognition",
    blurb: "See the word, recall what it means.",
  },
  {
    value: "production",
    label: "Production",
    short: "Production",
    blurb: "See the meaning, recall the word.",
  },
  { value: "both", label: "Both ways", short: "Both", blurb: "Every card is asked twice." },
];

export function directionLabel(d: Directions): string {
  return DIRECTIONS.find((o) => o.value === d)?.label ?? d;
}

/** The example that makes each choice concrete. A real card from the deck beats a made-up one. */
export interface DirectionExample {
  term: string;
  meaning: string | null;
}

function shown(o: DirectionOption, example: DirectionExample | undefined): string {
  if (!example?.meaning) return o.blurb;
  if (o.value === "recognition") return `See ${example.term} → recall “${example.meaning}”`;
  if (o.value === "production") return `See “${example.meaning}” → recall ${example.term}`;
  return "Both of the above, one card at a time.";
}

interface DirectionProps {
  value: Directions;
  onChange: (value: Directions) => void;
  /** A card from the deck, so each line reads with real words. */
  example?: DirectionExample | undefined;
  /** Active cards, for the line saying what changing this does to them. */
  total?: number | undefined;
  disabled?: boolean | undefined;
}

/**
 * One choice, three rows, each spelling out what the learner will be shown. Selection is
 * carried by the edge and the dot: amber stays on the flame and the one primary action.
 */
export function DirectionField({ value, onChange, example, total, disabled }: DirectionProps) {
  const name = useId();
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="sr-only">How cards are asked</legend>
      {DIRECTIONS.map((o) => {
        const on = o.value === value;
        return (
          <label
            key={o.value}
            className={clsx(
              "flex cursor-pointer items-start gap-3 rounded-md bg-plate p-3.5",
              "transition-[box-shadow,background-color,scale] duration-150 active:scale-[0.99]",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              on ? "edge-2" : "edge hoverable:hover:bg-hover",
              disabled && "cursor-not-allowed opacity-45",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={on}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={clsx(
                "mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full transition-[box-shadow] duration-150",
                on ? "shadow-[0_0_0_1px_var(--text)]" : "edge-2",
              )}
            >
              <span
                className={clsx(
                  "size-2.5 rounded-full bg-text transition-[scale,opacity] duration-150 motion-reduce:transition-none",
                  on ? "scale-100 opacity-100" : "scale-50 opacity-0",
                )}
              />
            </span>
            <span className="grid gap-0.5">
              <span className="text-base font-medium text-text">{o.label}</span>
              <span className="text-sm text-text-2">{shown(o, example)}</span>
            </span>
          </label>
        );
      })}
      <p className="pt-1 text-sm text-muted">
        {total
          ? "Adding a way asks every card in the deck that way, starting now. Taking one away keeps its progress; it just stops being asked."
          : "You can change this later. It applies to every card in the deck."}
      </p>
    </fieldset>
  );
}

/**
 * The same choice where there is no room to explain it: three segments and one line that
 * changes with them. Used while creating a deck, where the name is the thing being decided.
 */
export function DirectionCompact({
  value,
  onChange,
}: {
  value: Directions;
  onChange: (value: Directions) => void;
}) {
  const current = DIRECTIONS.find((o) => o.value === value);
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-text-2">How you are asked</span>
      <Segmented
        value={value}
        onChange={onChange}
        label="How you are asked"
        options={DIRECTIONS.map((o) => ({ value: o.value, label: o.short }))}
      />
      <p className="text-sm text-muted">{current?.blurb}</p>
    </div>
  );
}
