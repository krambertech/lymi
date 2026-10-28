import { i18n as globalI18n, type MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { type DeckPurpose, type Directions, isolate, LANGUAGE_TAGS } from "@lymi/core";
import { ClipboardCheck, Languages, Shapes } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { bidi } from "../lib/bidi";
import { RadioCard } from "./radio-card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxFilter,
} from "./ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { RadioGroup } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

/**
 * The two settings a deck carries besides its name, shared by the create sheet and the deck
 * settings screen so the same choice looks the same in both places.
 */

const TAGS: readonly string[] = LANGUAGE_TAGS;

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

interface LanguageOption {
  /** `null` is the row that clears the language. */
  value: string | null;
  label: string;
  /** The BCP 47 tag, shown at the end of the row. */
  hint?: string | undefined;
}

const optionLists = new Map<string, LanguageOption[]>();
/** The list in the interface language, sorted the way that language sorts. */
function optionsFor(locale: string): LanguageOption[] {
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
  /** Null leaves the field without one. */
  description?: string | null | undefined;
  /** Puts the description under the label rather than under the control. */
  descriptionFirst?: boolean | undefined;
  error?: string | undefined;
}

/**
 * Forty languages is a list you search, not a list you scroll. The tag rides along on each row,
 * because the tag tells Portuguese from Brazilian Portuguese and it is what the API stores. A valid
 * tag the list does not hold is still reachable: typed in full, it becomes the last row.
 */
export function LanguageField({
  value,
  onChange,
  label,
  description,
  descriptionFirst,
  error,
}: LanguageProps) {
  const { t } = useLingui();
  const fieldLabel = label ?? t`Language`;
  const hint = description !== null && (
    <FieldDescription>
      {description ?? t`New cards in this deck get this language.`}
    </FieldDescription>
  );
  return (
    <Field>
      <FieldLabel>{fieldLabel}</FieldLabel>
      {descriptionFirst && hint}
      <LanguageCombobox value={value} onChange={onChange}>
        <ComboboxTrigger>
          <ComboboxValue />
        </ComboboxTrigger>
      </LanguageCombobox>
      {!descriptionFirst && hint}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** The language list with a trigger of the caller's own, such as a chip in the card form's row. */
export function LanguageCombobox({
  value,
  onChange,
  label,
  children,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  /** Names the list when no Field label does. */
  label?: string | undefined;
  /** The trigger: a `ComboboxTrigger`. */
  children: ReactNode;
}) {
  const { t, i18n } = useLingui();
  const [query, setQuery] = useState("");
  const { contains } = useComboboxFilter({ locale: i18n.locale });
  const none: LanguageOption = { value: null, label: t`No language` };
  const base = optionsFor(i18n.locale);
  // A tag chosen by hand belongs in the list too, so it reads by name and shows as selected.
  const known =
    value && !TAGS.includes(value)
      ? [...base, { value, label: languageName(value, i18n.locale), hint: value }]
      : base;

  const tag = query.trim();
  const matches = tag
    ? known.filter((o) => contains(o.label, tag) || contains(o.hint ?? "", tag))
    : [none, ...known];
  // Offered beside partial matches too, since "sw" is inside "Swedish" and would otherwise be unreachable.
  const custom: LanguageOption | null =
    TAG_RE.test(tag) && !known.some((o) => o.hint?.toLowerCase() === tag.toLowerCase())
      ? { value: tag, label: t`Use “${{ tag: isolate(tag) }}” as the tag` }
      : null;
  const shown = custom ? [...matches, custom] : matches;

  return (
    <Combobox<LanguageOption>
      items={custom ? [none, ...known, custom] : [none, ...known]}
      filteredItems={shown}
      value={known.find((o) => o.value === value) ?? none}
      onValueChange={(next) => onChange(next?.value ?? null)}
      isItemEqualToValue={(a, b) => a.value === b.value}
      inputValue={query}
      onInputValueChange={setQuery}
      // On opening rather than closing, so the closing list does not flash back to every language.
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
    >
      {children}
      <ComboboxContent aria-label={label}>
        <ComboboxInput placeholder={t`Search languages`} />
        <ComboboxEmpty>
          <Trans>No language by that name. Type its tag to use it anyway.</Trans>
        </ComboboxEmpty>
        <ComboboxList>
          {(option: LanguageOption) => (
            <ComboboxItem key={option.value ?? ""} value={option}>
              <span className="flex-1 truncate">{bidi(option.label)}</span>
              {option.hint && <ComboboxItemHint>{option.hint}</ComboboxItemHint>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

interface DirectionOption {
  value: Directions;
  label: MessageDescriptor;
  blurb: MessageDescriptor;
}

export const DIRECTIONS: DirectionOption[] = [
  {
    value: "recognition",
    label: msg`Recognition`,
    blurb: msg`See the term, recall what it means.`,
  },
  {
    value: "production",
    label: msg`Production`,
    blurb: msg`See the meaning, recall the term.`,
  },
  {
    value: "both",
    label: msg`Both ways`,
    blurb: msg`Each card is asked both ways, each way on its own schedule.`,
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
  const noteId = useId();
  const shown = (o: DirectionOption): string => {
    if (!example?.meaning) return i18n._(o.blurb);
    if (o.value === "recognition")
      return t`See ${isolate(example.term)} → recall “${isolate(example.meaning)}”`;
    if (o.value === "production")
      return t`See “${isolate(example.meaning)}” → recall ${isolate(example.term)}`;
    return t`Both of the above, one card at a time.`;
  };
  return (
    <div className="grid gap-2">
      <RadioGroup<Directions>
        aria-label={t`Review modes`}
        aria-describedby={noteId}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        {DIRECTIONS.map((o) => (
          <RadioCard key={o.value} value={o.value} title={i18n._(o.label)} description={shown(o)} />
        ))}
      </RadioGroup>
      <p id={noteId} className="pt-1 text-sm text-ink-muted">
        {total ? (
          <Trans>
            New modes apply to cards that follow this deck. Turning a mode off keeps its progress.
          </Trans>
        ) : (
          <Trans>You can change this later. It applies to every card in the deck.</Trans>
        )}
      </p>
    </div>
  );
}

interface PurposeOption {
  value: DeckPurpose;
  icon: ReactNode;
  label: MessageDescriptor;
  blurb: MessageDescriptor;
}

export const PURPOSES: PurposeOption[] = [
  {
    value: "language",
    icon: <Languages />,
    label: msg({ message: "A language", context: "deck purpose" }),
    blurb: msg`Words and phrases in a language you’re learning.`,
  },
  {
    value: "subject",
    icon: <ClipboardCheck />,
    label: msg`A subject or exam`,
    blurb: msg`Terms with short explanations, like for a citizenship test.`,
  },
  {
    value: "other",
    icon: <Shapes />,
    label: msg`Something else`,
    blurb: msg`Your own material, whatever it is.`,
  },
];

interface PurposeProps {
  value: DeckPurpose | null;
  onChange: (value: DeckPurpose) => void;
  error?: string | undefined;
  description?: string | undefined;
  descriptionFirst?: boolean | undefined;
}

/** What the deck is for, which decides what AI fills on its cards until the owner chooses. */
export function PurposeField({
  value,
  onChange,
  error,
  description,
  descriptionFirst,
}: PurposeProps) {
  const { t, i18n } = useLingui();
  const labelId = useId();
  const hint = description && <FieldDescription>{description}</FieldDescription>;
  return (
    <Field>
      <FieldLabel id={labelId}>{t`What it’s for`}</FieldLabel>
      {descriptionFirst && hint}
      <RadioGroup<DeckPurpose | null>
        aria-labelledby={labelId}
        // Null, not undefined, so the group stays controlled before anything is chosen.
        value={value}
        onValueChange={(next) => next && onChange(next)}
      >
        {PURPOSES.map((o) => (
          <RadioCard
            key={o.value}
            value={o.value}
            icon={o.icon}
            title={i18n._(o.label)}
            description={i18n._(o.blurb)}
          />
        ))}
      </RadioGroup>
      {!descriptionFirst && hint}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/**
 * The deck's review mode as a select, where a sheet has no room for a card per choice. Each row and
 * the line under the label say what the learner will be shown.
 */
export function DirectionSelect({
  value,
  onChange,
}: {
  value: Directions;
  onChange: (value: Directions) => void;
}) {
  const { t, i18n } = useLingui();
  const current = DIRECTIONS.find((o) => o.value === value);
  return (
    <Field>
      <FieldLabel>{t`Review mode`}</FieldLabel>
      {current && <FieldDescription>{i18n._(current.blurb)}</FieldDescription>}
      <Select
        value={value}
        onValueChange={(next) => next && onChange(next as Directions)}
        items={DIRECTIONS.map((o) => ({ value: o.value, label: i18n._(o.label) }))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        {/* The box's width, so the captions wrap rather than widen the list past the sheet. */}
        <SelectContent className="w-(--anchor-width)">
          {DIRECTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} description={i18n._(o.blurb)}>
              {i18n._(o.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
