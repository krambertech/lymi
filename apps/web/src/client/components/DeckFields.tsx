import { i18n as globalI18n, type MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Directions } from "@lymi/core";
import { useId } from "react";
import { Combobox, type ComboboxOption } from "./Combobox";
import { Field } from "./Field";
import { RadioCard } from "./RadioCard";
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

/** One display-name lookup per interface language; the locale can change while the app runs. */
const names = new Map<string, Intl.DisplayNames | null>();
/** "it" reads as Italian. Falls back to the tag where the browser has no name for it. */
export function languageName(tag: string, locale: string = globalI18n.locale): string {
  if (!names.has(locale)) {
    try {
      names.set(locale, new Intl.DisplayNames([locale], { type: "language" }));
    } catch {
      names.set(locale, null);
    }
  }
  try {
    return names.get(locale)?.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

const optionLists = new Map<string, ComboboxOption[]>();
/** The list in the interface language, sorted the way that language sorts. */
function optionsFor(locale: string): ComboboxOption[] {
  let list = optionLists.get(locale);
  if (!list) {
    list = TAGS.map((tag) => ({ value: tag, label: languageName(tag, locale), hint: tag })).sort(
      (a, b) => a.label.localeCompare(b.label, locale),
    );
    optionLists.set(locale, list);
  }
  return list;
}

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
export function LanguageField({ value, onChange, label, hint, error }: LanguageProps) {
  const { t, i18n } = useLingui();
  const base = optionsFor(i18n.locale);
  // A tag chosen by hand belongs in the list too, so it reads by name and shows as selected.
  const options =
    value && !TAGS.includes(value)
      ? [...base, { value, label: languageName(value, i18n.locale), hint: value }]
      : base;
  return (
    <Field
      label={label ?? t`Language`}
      hint={hint ?? t`The language this deck’s cards are in. It fills in on every new card.`}
      error={error}
    >
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        clearLabel={t`No language`}
        searchLabel={t`Search languages`}
        accept={(query) => (TAG_RE.test(query) ? query : null)}
        acceptLabel={(tag) => t`Use “${tag}” as the tag`}
        emptyLabel={t`No language by that name. Type its tag to use it anyway.`}
      />
    </Field>
  );
}

interface DirectionOption {
  value: Directions;
  label: MessageDescriptor;
  short: MessageDescriptor;
  blurb: MessageDescriptor;
}

export const DIRECTIONS: DirectionOption[] = [
  {
    value: "recognition",
    label: msg`Recognition`,
    short: msg`Recognition`,
    blurb: msg`See the term, recall what it means.`,
  },
  {
    value: "production",
    label: msg`Production`,
    short: msg`Production`,
    blurb: msg`See the meaning, recall the term.`,
  },
  {
    value: "both",
    label: msg`Both ways`,
    short: msg`Both`,
    blurb: msg`Every card is asked twice.`,
  },
];

export function directionLabel(d: Directions): string {
  const option = DIRECTIONS.find((o) => o.value === d);
  return option ? globalI18n._(option.label) : d;
}

/** The example that makes each choice concrete. A real card from the deck beats a made-up one. */
export interface DirectionExample {
  term: string;
  meaning: string | null;
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

/** One choice, three rows, each spelling out what the learner will be shown. */
export function DirectionField({ value, onChange, example, total, disabled }: DirectionProps) {
  const { t, i18n } = useLingui();
  const name = useId();
  const shown = (o: DirectionOption): string => {
    if (!example?.meaning) return i18n._(o.blurb);
    if (o.value === "recognition") return t`See ${example.term} → recall “${example.meaning}”`;
    if (o.value === "production") return t`See “${example.meaning}” → recall ${example.term}`;
    return t`Both of the above, one card at a time.`;
  };
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="sr-only">
        <Trans>How cards are asked</Trans>
      </legend>
      {DIRECTIONS.map((o) => (
        <RadioCard
          key={o.value}
          name={name}
          value={o.value}
          checked={o.value === value}
          onChange={() => onChange(o.value)}
          title={i18n._(o.label)}
          description={shown(o)}
          disabled={disabled}
        />
      ))}
      <p className="pt-1 text-sm text-muted">
        {total ? (
          <Trans>
            Adding a way asks every card in the deck that way, starting now. Taking one away keeps
            its progress; it just stops being asked.
          </Trans>
        ) : (
          <Trans>You can change this later. It applies to every card in the deck.</Trans>
        )}
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
  const { t, i18n } = useLingui();
  const current = DIRECTIONS.find((o) => o.value === value);
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-text-2">
        <Trans>How you are asked</Trans>
      </span>
      <Segmented
        value={value}
        onChange={onChange}
        label={t`How you are asked`}
        options={DIRECTIONS.map((o) => ({ value: o.value, label: i18n._(o.short) }))}
      />
      <p className="text-sm text-muted">{current && i18n._(current.blurb)}</p>
    </div>
  );
}
