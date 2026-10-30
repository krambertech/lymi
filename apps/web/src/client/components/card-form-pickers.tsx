import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { isolate, REVIEW_MODE_KEYS, type ReviewModeKey, TAG_LIMITS } from "@lymi/core";
import { ArrowLeftRight, Languages, Layers, Plus, Tag } from "lucide-react";
import { type ReactElement, useState } from "react";
import { bidi } from "../lib/bidi";
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
  /** The row that adds what was typed: each comma-separated name, in the spelling it has if in use. */
  create?: string[] | undefined;
  /** A row that says why nothing can be added, chosen by nobody. */
  note?: boolean | undefined;
}

const sameTag = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** The names typed into the search, split on commas as the tags box did, each once. */
function typedNames(query: string) {
  const names: string[] = [];
  for (const part of query.split(/[,\n]/)) {
    const name = part.trim();
    if (name && !names.some((n) => sameTag(n, name))) names.push(name);
  }
  return names;
}

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
  const typed = typedNames(query);
  const known: TagOption[] = [
    ...(inUse ?? []),
    ...value.filter((v) => !inUse?.some((u) => sameTag(u.name, v))).map((name) => ({ name })),
  ];
  const spelling = (name: string) => known.find((o) => sameTag(o.name, name))?.name ?? name;
  const has = (name: string) => value.some((v) => sameTag(v, name));
  const room = TAG_LIMITS.count - value.length;
  const needle = typed.length === 1 ? (typed[0] ?? "").toLocaleLowerCase() : "";
  const matches =
    typed.length > 1
      ? []
      : needle
        ? known
            .filter((o) => o.name.toLocaleLowerCase().includes(needle))
            // Those starting with what was typed come first, as in the tags box.
            .sort(
              (a, b) =>
                Number(!a.name.toLocaleLowerCase().startsWith(needle)) -
                Number(!b.name.toLocaleLowerCase().startsWith(needle)),
            )
        : known;
  const fresh = typed.filter((name) => !has(name));
  // A list typed with commas adds every name in it; one name adds itself when it is not in use.
  const wanted =
    typed.length > 1 ? fresh : fresh.filter((n) => !known.some((o) => sameTag(o.name, n)));
  const tooLong = wanted.some((name) => name.length > TAG_LIMITS.length);
  const extra: TagOption | null =
    wanted.length === 0
      ? null
      : tooLong
        ? { name: t`Keep each tag to ${TAG_LIMITS.length} characters or fewer.`, note: true }
        : wanted.length > room
          ? {
              name: t`${plural(TAG_LIMITS.count, { one: "A card holds up to # tag.", other: "A card holds up to # tags." })}`,
              note: true,
            }
          : { name: wanted.map(isolate).join(", "), create: wanted };
  const rows = extra ? [...matches, extra] : matches;
  const chosen = known.filter((o) => has(o.name));
  const label =
    value.length === 0
      ? t`Tags`
      : value.length === 1
        ? (value[0] ?? "")
        : t`${plural(value.length, { one: "# tag", other: "# tags" })}`;
  return (
    <Combobox<TagOption, true>
      multiple
      items={extra ? [...known, extra] : known}
      filteredItems={rows}
      value={chosen}
      onValueChange={(next) => {
        const row = next.find((o) => o.create);
        if (row?.create) {
          const adding = row.create.map(spelling).filter((name) => !has(name));
          for (const name of adding) {
            onTagAdded?.("typed", !!inUse?.some((u) => sameTag(u.name, name)));
          }
          onChange([...value, ...adding]);
          setQuery("");
          return;
        }
        const picked = next.filter((o) => !o.note).map((o) => o.name);
        const added = picked.filter((name) => !has(name));
        if (added.length > room) return;
        for (const name of added) {
          onTagAdded?.("suggestion", !!inUse?.some((u) => sameTag(u.name, name)));
        }
        onChange(picked);
        if (added.length) setQuery("");
      }}
      isItemEqualToValue={(a, b) => !a.create && !b.create && sameTag(a.name, b.name)}
      itemToStringLabel={(o) => o.name}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (open) setQuery("");
      }}
    >
      <WithTip tip={value.length > 1 ? names(value.map(isolate)) : null}>
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
        {/* With no tags yet there is nothing to find, so the field only makes one. */}
        <ComboboxInput
          icon={known.length ? undefined : Plus}
          placeholder={known.length ? t`Find or create a tag` : t`Name your first tag`}
        />
        <ComboboxEmpty className="grid justify-items-center gap-1 px-5 py-6 text-center">
          <span
            className="mb-2 grid size-10 place-items-center rounded-full bg-plate-nested text-ink-secondary"
            aria-hidden="true"
          >
            <Tag className="size-[18px]" strokeWidth={1.75} />
          </span>
          <span className="text-base font-medium text-ink">{t`No tags yet`}</span>
          <span className="max-w-[28ch] text-sm text-ink-secondary">
            {t`Type a name above, then press Enter to tag this card.`}
          </span>
        </ComboboxEmpty>
        <ComboboxList>
          {(option: TagOption) =>
            option.note ? (
              <ComboboxItem key="note" value={option} disabled className="text-ink-secondary">
                <span className="flex-1 whitespace-normal">{option.name}</span>
              </ComboboxItem>
            ) : option.create ? (
              <ComboboxItem
                key={`+${option.name}`}
                value={option}
                icon={<Plus className="size-4 text-ink-secondary" />}
              >
                <span className="flex-1 truncate">
                  {bidi(
                    t`Create ${names(option.create.map((name) => t`“${{ name: isolate(name) }}”`))}`,
                  )}
                </span>
              </ComboboxItem>
            ) : (
              <ComboboxItem
                key={option.name}
                value={option}
                disabled={room <= 0 && !has(option.name)}
              >
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
    ? t`How it’s asked`
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
                value ? t`How it’s asked: ${names(value.map(modeName))}` : t`How it’s asked`
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
      <DropdownMenuContent aria-label={t`How it’s asked`} className="w-72">
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={(on) => {
            if (on) onChange(null);
          }}
          className={row}
        >
          <span className="min-w-0">
            <span className="block">{t`Same as the deck`}</span>
            <span className="block text-sm text-ink-muted">{names(deckModes.map(modeName))}</span>
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
              <span className="block text-sm text-ink-muted [overflow-wrap:anywhere]">
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
