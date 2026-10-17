import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { REVIEW_MODE_KEYS, type ReviewModeKey } from "@lymi/core";
import { ArrowLeftRight, Languages, Layers, Plus, Tag } from "lucide-react";
import { type ReactElement, useState } from "react";
import { MODE_LABELS } from "../lib/review-modes";
import { LanguageCombobox, languageName } from "./deck-fields";
import { FieldChipContent, fieldChipClassName } from "./field-chip";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemHint,
  ComboboxList,
  ComboboxTrigger,
} from "./ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Select, SelectContent, SelectTrigger } from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/*
 * The card form's choices, each a chip that opens its list and then shows what was chosen.
 * docs/design/library-decks-and-cards.md, "Adding and editing a card".
 */

/** A chip that stands for several names lists them on hover; its accessible name already does. */
function WithTip({ tip, children }: { tip: string | null; children: ReactElement }) {
  return (
    <Tooltip disabled={!tip}>
      <TooltipTrigger render={children} />
      <TooltipContent side="top">{tip}</TooltipContent>
    </Tooltip>
  );
}

function useNames() {
  const { i18n } = useLingui();
  return (names: string[]) =>
    new Intl.ListFormat(i18n.locale, { style: "long", type: "conjunction" }).format(names);
}

export function SectionChip({
  sections,
  value,
  onChange,
}: {
  sections: { id: string; name: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t } = useLingui();
  const name = sections.find((s) => s.id === value)?.name;
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v ? v : null)}
      items={[
        { value: "", label: t`No section` },
        ...sections.map((s) => ({ value: s.id, label: s.name })),
      ]}
    >
      <SelectTrigger
        look="chip"
        className={fieldChipClassName(!!name)}
        aria-label={name ? t`Section: ${name}` : t`Section`}
      >
        <FieldChipContent icon={Layers} filled={!!name}>
          {name ?? t`Section`}
        </FieldChipContent>
      </SelectTrigger>
      <SelectContent aria-label={t`Section`} />
    </Select>
  );
}

interface TagOption {
  name: string;
  cards?: number | undefined;
  /** The row that makes a tag of what was typed. */
  create?: boolean | undefined;
}

const sameTag = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export function TagsChip({
  value,
  onChange,
  inUse,
  invalid,
  onTagAdded,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  /** The learner's tags with their card counts, most used first. */
  inUse: { name: string; cards?: number | undefined }[] | undefined;
  invalid?: boolean | undefined;
  onTagAdded?: ((via: "suggestion" | "typed", inUse: boolean) => void) | undefined;
}) {
  const { t } = useLingui();
  const names = useNames();
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const known: TagOption[] = [
    ...(inUse ?? []),
    ...value.filter((v) => !inUse?.some((u) => sameTag(u.name, v))).map((name) => ({ name })),
  ];
  const needle = typed.toLocaleLowerCase();
  const matches = typed
    ? known
        .filter((o) => o.name.toLocaleLowerCase().includes(needle))
        // Those starting with what was typed come first, as in the tags box.
        .sort(
          (a, b) =>
            Number(!a.name.toLocaleLowerCase().startsWith(needle)) -
            Number(!b.name.toLocaleLowerCase().startsWith(needle)),
        )
    : known;
  const create: TagOption | null =
    typed && !known.some((o) => sameTag(o.name, typed)) ? { name: typed, create: true } : null;
  const rows = create ? [...matches, create] : matches;
  const chosen = known.filter((o) => value.some((v) => sameTag(v, o.name)));
  const label =
    value.length === 0
      ? t`Tags`
      : value.length === 1
        ? (value[0] ?? "")
        : t`${plural(value.length, { one: "# tag", other: "# tags" })}`;
  return (
    <Combobox<TagOption, true>
      multiple
      items={create ? [...known, create] : known}
      filteredItems={rows}
      value={chosen}
      onValueChange={(next) => {
        const added = next.filter((o) => !value.some((v) => sameTag(v, o.name)));
        for (const o of added) {
          onTagAdded?.(
            o.create ? "typed" : "suggestion",
            !!inUse?.some((u) => sameTag(u.name, o.name)),
          );
        }
        onChange(next.map((o) => o.name));
        if (added.length) setQuery("");
      }}
      isItemEqualToValue={(a, b) => sameTag(a.name, b.name)}
      itemToStringLabel={(o) => o.name}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
    >
      <WithTip tip={value.length > 1 ? names(value) : null}>
        <ComboboxTrigger
          look="chip"
          className={fieldChipClassName(value.length > 0)}
          aria-label={value.length ? t`Tags: ${names(value)}` : t`Tags`}
          aria-invalid={invalid || undefined}
        >
          <FieldChipContent icon={Tag} filled={value.length > 0}>
            {label}
          </FieldChipContent>
        </ComboboxTrigger>
      </WithTip>
      <ComboboxContent aria-label={t`Tags`} className="min-w-64">
        <ComboboxInput placeholder={t`Find or create a tag`} />
        <ComboboxEmpty>{t`Type a name to create your first tag.`}</ComboboxEmpty>
        <ComboboxList>
          {(option: TagOption) =>
            option.create ? (
              <ComboboxItem key={`+${option.name}`} value={option}>
                <Plus className="size-4 shrink-0 text-text-2" aria-hidden="true" />
                <span className="flex-1 truncate">{t`Create “${option.name}”`}</span>
              </ComboboxItem>
            ) : (
              <ComboboxItem key={option.name} value={option}>
                <span className="flex-1 truncate">{option.name}</span>
                {option.cards !== undefined && <ComboboxItemHint>{option.cards}</ComboboxItemHint>}
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function ModesChip({
  value,
  deckModes,
  onChange,
  term,
  meaning,
  hasPicture,
  pictureDescribed,
  invalid,
}: {
  /** The card's own modes, or null while it follows its deck. */
  value: ReviewModeKey[] | null;
  deckModes: ReviewModeKey[];
  onChange: (value: ReviewModeKey[] | null) => void;
  term: string;
  meaning: string;
  hasPicture: boolean;
  /** A picture mode is asked only once the picture has a description. */
  pictureDescribed: boolean;
  invalid?: boolean | undefined;
}) {
  const { t, i18n } = useLingui();
  const names = useNames();
  const chosen = value ?? deckModes;
  const word = term.trim() || t`the term`;
  const answer = meaning.trim();
  const modeName = (key: ReviewModeKey) => i18n._(MODE_LABELS[key]);
  const blurb = (key: ReviewModeKey): string => {
    if (key === "term_to_meaning")
      return answer ? t`See ${word}, recall “${answer}”` : t`See ${word}, recall what it means`;
    if (key === "meaning_to_term")
      return answer ? t`See “${answer}”, recall ${word}` : t`See the meaning, recall ${word}`;
    if (key === "image_to_term") return t`See the picture, recall ${word}`;
    return answer ? t`See the picture, recall “${answer}”` : t`See the picture, recall the meaning`;
  };
  // The picture modes show once the card has a picture; ADR 0014.
  const keys = REVIEW_MODE_KEYS.filter(
    (key) => hasPicture || !key.startsWith("image_") || chosen.includes(key),
  );
  const toggle = (key: ReviewModeKey, on: boolean) => {
    const next = REVIEW_MODE_KEYS.filter((k) => (k === key ? on : chosen.includes(k)));
    const same = next.length === deckModes.length && next.every((k) => deckModes.includes(k));
    // A card is asked at least one way, and ticking back to the deck's follows the deck again.
    if (next.length === 0) return;
    onChange(same ? null : next);
  };
  const label = !value
    ? t`How it's asked`
    : value.length === 1
      ? modeName(value[0] as ReviewModeKey)
      : t`${plural(value.length, { one: "Asked # way", other: "Asked # ways" })}`;
  const tip = value && value.length > 1 ? names(value.map(modeName)) : null;
  // Two lines a row, as a described Select row: the tick sits beside the first.
  const row = "h-auto items-start py-2 whitespace-normal md:h-auto [&>span:first-child]:top-3";
  return (
    <DropdownMenu>
      <WithTip tip={tip}>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={fieldChipClassName(!!value)}
              aria-label={
                value ? t`How it's asked: ${names(value.map(modeName))}` : t`How it's asked`
              }
              aria-invalid={invalid || undefined}
            >
              <FieldChipContent icon={ArrowLeftRight} filled={!!value}>
                {label}
              </FieldChipContent>
            </button>
          }
        />
      </WithTip>
      <DropdownMenuContent aria-label={t`How it's asked`} className="w-72">
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={(on) => {
            if (on) onChange(null);
          }}
          className={row}
        >
          <span className="min-w-0">
            <span className="block">{t`Same as the deck`}</span>
            <span className="block text-sm text-muted">{names(deckModes.map(modeName))}</span>
          </span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {keys.map((key) => (
          <DropdownMenuCheckboxItem
            key={key}
            // The ticks are the modes in effect, the deck's included, so a press changes what it shows.
            checked={chosen.includes(key)}
            onCheckedChange={(on) => toggle(key, on)}
            className={row}
          >
            <span className="min-w-0">
              <span className="block">{modeName(key)}</span>
              <span className="block text-sm text-muted [overflow-wrap:anywhere]">
                {key.startsWith("image_") && !pictureDescribed
                  ? t`Asked once the picture has a description.`
                  : blurb(key)}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageChip({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { t, i18n } = useLingui();
  const name = value ? languageName(value, i18n.locale) : null;
  return (
    <LanguageCombobox value={value} onChange={onChange} label={t`Language`}>
      <ComboboxTrigger
        look="chip"
        className={fieldChipClassName(!!name)}
        aria-label={name ? t`Language: ${name}` : t`Language`}
      >
        <FieldChipContent icon={Languages} filled={!!name}>
          {name ?? t`No language`}
        </FieldChipContent>
      </ComboboxTrigger>
    </LanguageCombobox>
  );
}
