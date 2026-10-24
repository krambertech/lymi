import { ph, plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  activeFields,
  availableFields,
  type FilterContext,
  type FilterField,
  type FilterKey,
  keeps,
  ON,
  toggleValue,
} from "@lymi/client/deck-filters";
import { type DeckFilters, deckTags, noFilters } from "@lymi/client/deck-list";
import { isolate, unisolate } from "@lymi/core";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Layers,
  ListFilter,
  type LucideIcon,
  Star,
  Tag,
  X,
} from "lucide-react";
import { type KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/*
 * The deck list's Filter in two steps, as Linear's: the fields the deck can be narrowed by, then
 * one field's values with how many cards each keeps, in one menu that stays open while choosing.
 * Every row keeps one start slot, a field's icon or a value's tick, so the names line up in both
 * steps. Each field that is on is a chip whose label reopens its values and whose ✕ takes it off.
 * docs/design/library-decks-and-cards.md.
 */

/** A menu row greys its icons, so a state's mark takes its own colour back. */
const menuMarkColour = {
  new: "text-state-new!",
  learning: "text-state-learning!",
  known: "text-state-known!",
} as const;

const fieldIcon: Record<FilterKey, LucideIcon> = {
  state: CircleGauge,
  due: CalendarClock,
  section: Layers,
  tags: Tag,
  important: Star,
};

const analyticsKind: Record<FilterKey, "state" | "due" | "section" | "tag" | "important"> = {
  state: "state",
  due: "due",
  section: "section",
  tags: "tag",
  important: "important",
};

/** A one-of field's value for no value at all, such as Due's Any time. */
const ANY = "any";

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

/** How many are on, in the chosen chip's fill, so it never reads as a count of cards. */
function OnCount({ count }: { count: number }) {
  const { i18n } = useLingui();
  return (
    <span
      aria-hidden="true"
      className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-text px-1 text-2xs font-medium text-canvas tabular-nums"
    >
      {i18n.number(count)}
    </span>
  );
}

/** A value's name with how many cards it keeps. */
function ValueLabel({ name, count }: { name: string; count: number }) {
  const { i18n } = useLingui();
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{bidi(name)}</span>
      <span className="ms-auto ps-3 text-sm text-muted tabular-nums">{i18n.number(count)}</span>
    </>
  );
}

/** A field's values: rows that tick, or for a one-of field a set with Any first. */
function FieldValues({
  field,
  values,
  filters,
  setFilters,
  ctx,
}: FilterProps & { field: FilterField; values: string[] }) {
  const { t } = useLingui();
  const { valueName } = useFilterNames(ctx);
  const chosen = field.get(filters);
  const report = () => captureAnalytics("deck_filter_added", { kind: analyticsKind[field.key] });

  if (field.pick === "one") {
    return (
      <DropdownMenuRadioGroup
        value={chosen[0] ?? ANY}
        onValueChange={(value) => {
          if (value !== ANY) report();
          setFilters(field.set(filters, value === ANY ? [] : [value]));
        }}
      >
        <DropdownMenuRadioItem value={ANY} closeOnClick={false}>
          <ValueLabel name={t`Any time`} count={keeps(ctx, filters, field.key, null)} />
        </DropdownMenuRadioItem>
        {values.map((value) => (
          <DropdownMenuRadioItem key={value} value={value} closeOnClick={false}>
            <ValueLabel
              name={valueName(field.key, value)}
              count={keeps(ctx, filters, field.key, value)}
            />
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    );
  }

  return (
    <>
      {values.map((value) => (
        <DropdownMenuCheckboxItem
          key={value || "none"}
          checked={chosen.includes(value)}
          onCheckedChange={(on) => {
            if (on) report();
            setFilters(toggleValue(filters, field.key, value, on));
          }}
        >
          {field.key === "state" && (
            <StateIcon
              state={value as keyof typeof menuMarkColour}
              className={menuMarkColour[value as keyof typeof menuMarkColour]}
            />
          )}
          <ValueLabel
            name={valueName(field.key, value)}
            count={keeps(ctx, filters, field.key, value)}
          />
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}

const isRtl = (el: Element) => getComputedStyle(el).direction === "rtl";

/** Filter: the fields, then one field's values. The button counts the fields that are on. */
export function FilterMenu({ filters, setFilters, ctx }: FilterProps) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<FilterKey | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Where focus goes once a step has drawn, when the keyboard moved between steps.
  const focusAfter = useRef<string | null>(null);
  const fields = availableFields(ctx);
  const chosen = picking ? fields.find((f) => f.field.key === picking) : undefined;
  const { fieldName } = useFilterNames(ctx);
  const on = activeFields(filters).length;

  useLayoutEffect(() => {
    if (!focusAfter.current) return;
    contentRef.current?.querySelector<HTMLElement>(focusAfter.current)?.focus();
    focusAfter.current = null;
  });

  const pick = (key: FilterKey, byKeyboard: boolean) => {
    if (byKeyboard) focusAfter.current = '[role="group"] [role^="menuitem"]';
    setPicking(key);
  };
  const back = (byKeyboard: boolean) => {
    if (byKeyboard && picking) focusAfter.current = `[data-field="${picking}"]`;
    setPicking(null);
  };
  // The arrow that points into a step opens it and the one that points back leaves it, as a submenu's.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = isRtl(e.currentTarget);
    const into = rtl ? "ArrowLeft" : "ArrowRight";
    const out = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === out && picking) {
      e.preventDefault();
      back(true);
    } else if (e.key === into && !picking) {
      const key = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>(
        "[data-field]",
      )?.dataset.field as FilterKey | undefined;
      const field = key && fields.find((f) => f.field.key === key)?.field;
      if (field && field.pick !== "flag") {
        e.preventDefault();
        pick(field.key, true);
      }
    }
  };

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
          <Button
            size="sm"
            aria-label={
              on > 0
                ? plural(on, { one: "Filter, # filter on", other: "Filter, # filters on" })
                : t`Filter`
            }
          >
            <ListFilter data-icon="inline-start" aria-hidden="true" />
            <Trans>Filter</Trans>
            {on > 0 && (
              <span className="-me-1">
                <OnCount count={on} />
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent
        ref={contentRef}
        aria-label={chosen ? fieldName[chosen.field.key] : t`Filter`}
        className="data-side:w-56"
        onKeyDown={onKeyDown}
      >
        {chosen ? (
          <>
            <DropdownMenuItem
              closeOnClick={false}
              onClick={(e) => back(e.detail === 0)}
              aria-label={t`Back to all filters`}
              className="text-text-2"
            >
              <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
              <span className="min-w-0 truncate font-medium text-text">
                {fieldName[chosen.field.key]}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <FieldValues
                field={chosen.field}
                values={chosen.values}
                filters={filters}
                setFilters={setFilters}
                ctx={ctx}
              />
            </DropdownMenuGroup>
          </>
        ) : (
          <DropdownMenuGroup>
            {fields.map(({ field }) => {
              const values = field.get(filters);
              const Icon = fieldIcon[field.key];
              // A flag has one value, so its row ticks at the end rather than opening a list of one.
              if (field.pick === "flag") {
                return (
                  <DropdownMenuCheckboxItem
                    key={field.key}
                    data-field={field.key}
                    icon={<Icon className="text-text-2" aria-hidden="true" />}
                    checked={values.length > 0}
                    onCheckedChange={(next) => {
                      if (next)
                        captureAnalytics("deck_filter_added", { kind: analyticsKind[field.key] });
                      setFilters(toggleValue(filters, field.key, ON, next));
                    }}
                  >
                    <ValueLabel
                      name={fieldName[field.key]}
                      count={keeps(ctx, filters, field.key, ON)}
                    />
                  </DropdownMenuCheckboxItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={field.key}
                  data-field={field.key}
                  aria-label={
                    values.length > 0
                      ? t`${{ field: fieldName[field.key] }}, ${{ count: values.length }} chosen`
                      : undefined
                  }
                  closeOnClick={false}
                  onClick={(e) => pick(field.key, e.detail === 0)}
                >
                  <Icon className="text-text-2" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{fieldName[field.key]}</span>
                  {values.length > 0 && <OnCount count={values.length} />}
                  <ChevronRight className="text-muted rtl:-scale-x-100" aria-hidden="true" />
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const chipPart =
  "relative flex items-center transition-colors duration-150 ease-out hoverable:hover:bg-hover hoverable:hover:text-text focus-visible:z-10 focus-visible:outline-offset-[-2px]";

/** One field that is on: its label opens its values again, and ✕ takes the field off. */
function ConditionChip({
  field,
  values,
  filters,
  setFilters,
  ctx,
}: FilterProps & { field: FilterField; values: string[] }) {
  const { t } = useLingui();
  const { fieldName, valueNames, chipLabel } = useFilterNames(ctx);
  const name = fieldName[field.key];
  const chosen = valueNames(field, values);
  const Icon = fieldIcon[field.key];
  const remove = (
    <button
      type="button"
      onClick={() => setFilters(field.set(filters, []))}
      aria-label={t`Remove filter: ${{ label: unisolate(chipLabel(field, values)) }}`}
      // The hit area reaches 40 px tall, as far as the 8 px gap to the next row allows.
      className={`${chipPart} w-8 shrink-0 justify-center rounded-e-full text-muted before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']`}
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
  // A flag has nothing more to choose, so its chip only comes off.
  if (field.pick === "flag") {
    return (
      <span className="inline-flex h-8 max-w-full items-stretch rounded-full bg-plate-2 text-sm font-medium text-text">
        <span className="flex items-center gap-1.5 ps-3 pe-1">
          <Star className="size-3.5 fill-current text-amber-mark" aria-hidden="true" />
          {name}
        </span>
        {remove}
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 max-w-full items-stretch rounded-full bg-plate-2 text-sm">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={`${chipPart} min-w-0 gap-1.5 rounded-s-full ps-3 pe-1.5 text-text-2 before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']`}
            >
              <Icon className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 truncate">
                <Trans>
                  {{ field: name }}:{" "}
                  <span className="font-medium text-text">
                    {ph({ values: isolate(unisolate(chosen)) })}
                  </span>
                </Trans>
              </span>
            </button>
          }
        />
        <DropdownMenuContent aria-label={name} className="data-side:w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel inset>{name}</DropdownMenuLabel>
            <FieldValues
              field={field}
              values={field.values(ctx)}
              filters={filters}
              setFilters={setFilters}
              ctx={ctx}
            />
          </DropdownMenuGroup>
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
        <button
          type="button"
          onClick={() => setFilters(noFilters)}
          // A pill like the chips it clears, with no fill until pointed at.
          className="relative h-8 rounded-full px-3 text-sm font-medium text-text-2 transition-colors duration-150 ease-out before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] active:scale-[0.97] hoverable:hover:bg-hover hoverable:hover:text-text motion-reduce:active:scale-100"
        >
          <Trans>Clear filters</Trans>
        </button>
      )}
    </div>
  );
}
