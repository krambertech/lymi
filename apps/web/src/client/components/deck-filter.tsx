import { Trans, useLingui } from "@lingui/react/macro";
import {
  activeFields,
  availableFields,
  type FilterContext,
  type FilterField,
  type FilterKey,
  filterField,
  keeps,
  ON,
  toggleValue,
} from "@lymi/client/deck-filters";
import { type DeckFilters, deckTags, noFilters } from "@lymi/client/deck-list";
import { isolate, unisolate } from "@lymi/core";
import { ChevronLeft, ChevronRight, ListFilter, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { bidi } from "../lib/bidi";
import { captureAnalytics } from "../lib/telemetry";
import { Button } from "./button";
import { StateIcon, stateMarks } from "./state-mark";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/*
 * The deck list's Filter in two steps, as Linear's: the fields the deck can be narrowed by, then
 * one field's values with how many cards each keeps, in one menu that stays open while choosing.
 * Each field that is on is a chip whose label reopens its values and whose ✕ takes it off. The
 * fields come from `filterFields`, so a new one needs a name here and nothing more.
 * docs/design/library-decks-and-cards.md.
 */

/** A menu row greys its icons, so a state's mark takes its own colour back. */
const menuMarkColour = {
  new: "text-state-new!",
  learning: "text-state-learning!",
  known: "text-state-known!",
} as const;

const analyticsKind: Record<FilterKey, "state" | "due" | "section" | "tag" | "important"> = {
  state: "state",
  due: "due",
  section: "section",
  tags: "tag",
  important: "important",
};

interface FilterProps {
  filters: DeckFilters;
  setFilters: (next: DeckFilters) => void;
  ctx: FilterContext;
}

/** What each field and value is called; the package keeps the shape and the app the words. */
function useFilterNames(ctx: FilterContext) {
  const { t, i18n } = useLingui();
  const tags = useMemo(() => deckTags(ctx.rows), [ctx.rows]);
  const fieldName: Record<FilterKey, string> = {
    state: t`State`,
    due: t`Due`,
    section: t`Section`,
    tags: t`Tags`,
    important: t`Important`,
  };
  const valueName = (key: FilterKey, value: string): string => {
    switch (key) {
      case "state":
        return i18n._(stateMarks[value as keyof typeof stateMarks].groupLabel);
      case "due":
        return value === "today" ? t`Today` : t`This week`;
      case "section":
        return value
          ? isolate(ctx.sections.find((s) => s.id === value)?.name ?? "")
          : t`No section`;
      case "tags":
        return isolate(tags.find((tag) => tag.key === value)?.name ?? value);
      case "important":
        return t`Important`;
    }
  };
  // In the field's own order, not the order they were ticked, so a chip reads like the menu.
  const list = new Intl.ListFormat(i18n.locale, { type: "conjunction", style: "narrow" });
  const valueNames = (field: FilterField, values: readonly string[]) =>
    list.format(
      field
        .values(ctx)
        .filter((v) => values.includes(v))
        .map((v) => valueName(field.key, v)),
    );
  /** "State: New, Known"; a flag is just its name. */
  const chipLabel = (field: FilterField, values: readonly string[]) => {
    const name = fieldName[field.key];
    if (field.pick === "flag") return name;
    const chosen = valueNames(field, values);
    return t`${{ field: name }}: ${{ values: chosen }}`;
  };
  return { fieldName, valueName, valueNames, chipLabel };
}

/** A field's values as rows that tick, each saying how many cards it keeps. */
function FieldValues({
  field,
  values,
  filters,
  setFilters,
  ctx,
}: FilterProps & { field: FilterField; values: string[] }) {
  const { i18n } = useLingui();
  const { valueName } = useFilterNames(ctx);
  const chosen = field.get(filters);
  const choose = (value: string, on: boolean) => {
    if (on) captureAnalytics("deck_filter_added", { kind: analyticsKind[field.key] });
    setFilters(toggleValue(filters, field.key, value, on));
  };
  return (
    <>
      {values.map((value) => (
        <DropdownMenuCheckboxItem
          key={value || "none"}
          checked={chosen.includes(value)}
          onCheckedChange={(on) => choose(value, on)}
        >
          {field.key === "state" && (
            <StateIcon
              state={value as keyof typeof menuMarkColour}
              className={menuMarkColour[value as keyof typeof menuMarkColour]}
            />
          )}
          {field.key === "important" && <Star className="text-amber!" />}
          <span className="min-w-0 flex-1 truncate">{bidi(valueName(field.key, value))}</span>
          <span className="ms-auto ps-3 text-sm text-muted tabular-nums">
            {i18n.number(keeps(ctx, filters, field.key, value))}
          </span>
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

/** Filter: the fields, then one field's values. The button counts the fields that are on. */
export function FilterMenu({ filters, setFilters, ctx }: FilterProps) {
  const { t, i18n } = useLingui();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<FilterKey | null>(null);
  const fields = availableFields(ctx);
  const chosen = picking ? fields.find((f) => f.field.key === picking) : undefined;
  const { fieldName, valueNames } = useFilterNames(ctx);
  const on = activeFields(filters).length;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // The next opening starts at the fields again.
        if (!next) setPicking(null);
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button size="sm" aria-label={on > 0 ? t`Filter, ${on} on` : t`Filter`}>
            <ListFilter data-icon="inline-start" aria-hidden="true" />
            <Trans>Filter</Trans>
            {on > 0 && (
              <span
                aria-hidden="true"
                className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-text px-1 text-2xs font-medium text-canvas tabular-nums"
              >
                {i18n.number(on)}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        aria-label={chosen ? fieldName[chosen.field.key] : t`Filter`}
        className="min-w-72"
      >
        {chosen ? (
          <>
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setPicking(null)}
              className="font-medium"
            >
              <ChevronLeft />
              {fieldName[chosen.field.key]}
              <span className="sr-only">{t`, back to all filters`}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <FieldValues
              field={chosen.field}
              values={chosen.values}
              filters={filters}
              setFilters={setFilters}
              ctx={ctx}
            />
          </>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>
              <Trans>Filter by</Trans>
            </DropdownMenuLabel>
            {fields.map(({ field }) => {
              const values = field.get(filters);
              // A flag has one value, so its row ticks it rather than opening a list of one.
              if (field.pick === "flag") {
                return (
                  <DropdownMenuCheckboxItem
                    key={field.key}
                    checked={values.length > 0}
                    onCheckedChange={(next) => {
                      if (next)
                        captureAnalytics("deck_filter_added", { kind: analyticsKind[field.key] });
                      setFilters(toggleValue(filters, field.key, ON, next));
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate">{fieldName[field.key]}</span>
                    <span className="ms-auto ps-3 text-sm text-muted tabular-nums">
                      {i18n.number(keeps(ctx, filters, field.key, ON))}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={field.key}
                  inset
                  closeOnClick={false}
                  onClick={() => setPicking(field.key)}
                >
                  <span className="min-w-0 flex-1 truncate">{fieldName[field.key]}</span>
                  {values.length > 0 && (
                    <span className="min-w-0 max-w-[45%] truncate text-sm text-muted">
                      {bidi(valueNames(field, values))}
                    </span>
                  )}
                  <ChevronRight className="text-muted" />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One field that is on: its label opens its values again, and ✕ takes the field off. */
function ConditionChip({
  field,
  values,
  filters,
  setFilters,
  ctx,
}: FilterProps & { field: FilterField; values: string[] }) {
  const { t } = useLingui();
  const { fieldName, chipLabel } = useFilterNames(ctx);
  const name = fieldName[field.key];
  const label = chipLabel(field, values);
  const remove = (
    <button
      type="button"
      onClick={() => setFilters(field.set(filters, []))}
      aria-label={t`Remove filter: ${{ label: unisolate(label) }}`}
      className="relative grid place-items-center pe-2 ps-0.5 text-muted transition-colors duration-150 before:absolute before:-inset-y-1 before:content-[''] hoverable:hover:bg-hover hoverable:hover:text-text"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
  // A flag has nothing more to choose, so its chip only comes off.
  if (field.pick === "flag") {
    return (
      <span className="inline-flex h-8 max-w-full items-stretch overflow-hidden rounded-full bg-plate-2 text-sm font-medium text-text-2">
        <span className="flex items-center gap-1.5 ps-3 pe-1">
          <Star className="size-3.5 text-amber" aria-hidden="true" />
          {label}
        </span>
        {remove}
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 max-w-full items-stretch overflow-hidden rounded-full bg-plate-2 text-sm font-medium text-text-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="min-w-0 truncate ps-3 pe-1.5 transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text"
            >
              {bidi(label)}
            </button>
          }
        />
        <DropdownMenuContent aria-label={name} className="min-w-72">
          <FieldValues
            field={field}
            values={field.values(ctx)}
            filters={filters}
            setFilters={setFilters}
            ctx={ctx}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      {remove}
    </span>
  );
}

/** The fields that are on, one chip each, with Clear filters once there are two. */
export function FilterChips({ filters, setFilters, ctx }: FilterProps) {
  const active = activeFields(filters);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map(({ field, values }) => (
        <ConditionChip
          key={field.key}
          field={field}
          values={values}
          filters={filters}
          setFilters={setFilters}
          ctx={ctx}
        />
      ))}
      {active.length > 1 && (
        <Button size="sm" variant="ghost" onClick={() => setFilters(noFilters)}>
          <Trans>Clear filters</Trans>
        </Button>
      )}
    </div>
  );
}

export { filterField };
