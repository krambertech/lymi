import { Trans, useLingui } from "@lingui/react/macro";
import { ChevronLeft, ChevronRight, ListFilter, X } from "lucide-react";
import { useState } from "react";
import {
  availableFields,
  conditionOf,
  type FilterContext,
  type FilterField,
  type FilterKey,
  type FilterOption,
  type FilterSet,
  filterField,
  noFilters,
  toggleValue,
  withValues,
} from "../lib/card-filters";
import { Button } from "./button";
import { StateIcon } from "./state-mark";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/*
 * The deck list's filter as Linear shapes it: Filter opens a list of fields, a field opens its
 * values, and each field that is on becomes a chip that reopens those values or comes off with
 * its ✕. The fields come from `filterFields`, so this file draws any of them without knowing
 * which exist; docs/design/library-decks-and-cards.md.
 */

/** A menu row greys its icons, so a state's mark takes its own colour back. */
const menuMarkColour = {
  new: "text-state-new!",
  learning: "text-state-learning!",
  known: "text-state-known!",
} as const;

interface FilterProps {
  filters: FilterSet;
  setFilters: (next: FilterSet) => void;
  ctx: FilterContext;
}

/** The values a field offers, as checkboxes or a radio set; the menu stays open while choosing. */
function FieldValues({
  field,
  options,
  filters,
  setFilters,
}: FilterProps & { field: FilterField; options: FilterOption[] }) {
  const values = conditionOf(filters, field.key)?.values ?? [];
  const mark = (option: FilterOption) =>
    option.state && <StateIcon state={option.state} className={menuMarkColour[option.state]} />;
  if (field.pick === "one") {
    return (
      <DropdownMenuRadioGroup
        value={values[0] ?? ""}
        onValueChange={(value) => setFilters(toggleValue(filters, field.key, value, true))}
      >
        {options.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick={false}>
            {mark(option)}
            <span className="truncate">{option.label}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    );
  }
  return (
    <>
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={values.includes(option.value)}
          onCheckedChange={(on) => setFilters(toggleValue(filters, field.key, option.value, on))}
        >
          {mark(option)}
          <span className="truncate">{option.label}</span>
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

/** "New, Known": a field's chosen values, named in the interface language's list form. */
function useValueNames() {
  const { i18n } = useLingui();
  const list = new Intl.ListFormat(i18n.locale, { type: "conjunction", style: "narrow" });
  // In the field's own order, not the order they were ticked, so the chip reads like the menu.
  return (options: FilterOption[], values: readonly string[]) =>
    list.format(options.filter((o) => values.includes(o.value)).map((o) => o.label));
}

/** Filter: the fields, then one field's values, in one menu that stays open while choosing. */
export function FilterMenu({ filters, setFilters, ctx }: FilterProps) {
  const { t, i18n } = useLingui();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<FilterKey | null>(null);
  const fields = availableFields(ctx);
  const chosen = picking ? fields.find((f) => f.field.key === picking) : undefined;
  const names = useValueNames();

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
          <Button size="sm">
            <ListFilter aria-hidden="true" />
            <Trans>Filter</Trans>
          </Button>
        }
      />
      <DropdownMenuContent
        aria-label={chosen ? i18n._(chosen.field.label) : t`Filter`}
        className="max-w-[min(20rem,var(--available-width))]"
      >
        {chosen ? (
          <>
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setPicking(null)}
              className="font-medium"
            >
              <ChevronLeft />
              {i18n._(chosen.field.label)}
              <span className="sr-only">{t`, back to all filters`}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <FieldValues
              field={chosen.field}
              options={chosen.options}
              filters={filters}
              setFilters={setFilters}
              ctx={ctx}
            />
          </>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <Trans>Filter by</Trans>
            </DropdownMenuLabel>
            {fields.map(({ field, options }) => {
              const values = conditionOf(filters, field.key)?.values;
              return (
                <DropdownMenuItem
                  key={field.key}
                  closeOnClick={false}
                  onClick={() => setPicking(field.key)}
                >
                  <span className="min-w-0 flex-1 truncate">{i18n._(field.label)}</span>
                  {values && (
                    <span className="min-w-0 max-w-[45%] truncate text-sm text-muted">
                      {names(options, values)}
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
  options,
  filters,
  setFilters,
  ctx,
}: FilterProps & { field: FilterField; options: FilterOption[] }) {
  const { t, i18n } = useLingui();
  const names = useValueNames();
  const fieldName = i18n._(field.label);
  const values = conditionOf(filters, field.key)?.values ?? [];
  const label = t`${fieldName}: ${names(options, values)}`;
  return (
    <span className="inline-flex h-8 max-w-full items-stretch overflow-hidden rounded-full bg-plate-2 text-sm font-medium text-text-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="min-w-0 truncate ps-3 pe-1.5 transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text"
            >
              {label}
            </button>
          }
        />
        <DropdownMenuContent
          aria-label={fieldName}
          className="max-w-[min(20rem,var(--available-width))]"
        >
          <FieldValues
            field={field}
            options={options}
            filters={filters}
            setFilters={setFilters}
            ctx={ctx}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <button
        type="button"
        onClick={() => setFilters(withValues(filters, field.key, []))}
        aria-label={t`Remove ${fieldName} filter`}
        className="grid place-items-center pe-2 ps-0.5 text-muted transition-colors duration-150 hoverable:hover:bg-hover hoverable:hover:text-text"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

/** The fields that are on, one chip each, with Clear filters once there are two. */
export function FilterChips({ filters, setFilters, ctx }: FilterProps) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((condition) => {
        const field = filterField(condition.key);
        return (
          <ConditionChip
            key={condition.key}
            field={field}
            options={field.options(ctx)}
            filters={filters}
            setFilters={setFilters}
            ctx={ctx}
          />
        );
      })}
      {filters.length > 1 && (
        <Button size="sm" variant="ghost" onClick={() => setFilters(noFilters)}>
          <Trans>Clear filters</Trans>
        </Button>
      )}
    </div>
  );
}
