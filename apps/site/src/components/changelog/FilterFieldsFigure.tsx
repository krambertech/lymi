import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import {
  CalendarClock,
  Check,
  ChevronRight,
  CircleGauge,
  Layers,
  ListFilter,
  Star,
  Tag,
  X,
} from "lucide-react";

/** Filter's two steps: the fields, then one field's values with how many cards each keeps. */
export function FilterFieldsFigure() {
  const { t } = useLingui();
  const learning = t({ message: "Learning", context: "cards in this state" });
  const fields = [
    { icon: CircleGauge, name: t`State`, on: true },
    { icon: CalendarClock, name: t`Due` },
    { icon: Layers, name: t`Section` },
    { icon: Tag, name: t`Tags` },
    { icon: Star, name: t`Important` },
  ];
  const values = [
    { name: t({ message: "New", context: "cards in this state" }), cards: 42 },
    { name: learning, cards: 18, chosen: true },
    { name: t({ message: "Known", context: "cards in this state" }), cards: 126 },
  ];
  return (
    <div
      aria-hidden="true"
      className="mx-auto grid w-fit grid-cols-[11.5rem_10.5rem] items-start gap-3"
    >
      <div className="grid justify-items-start">
        <span className="inline-flex h-9 items-center gap-2 rounded-md bg-plate-hover px-3 text-sm font-medium text-ink edge">
          <ListFilter className="size-4" />
          <Trans>Filter</Trans>
        </span>
        <div className="mt-1.5 grid w-full rounded-md bg-sheet p-1 edge-drop">
          {fields.map((field) => (
            <span
              key={field.name}
              className={clsx(
                "flex items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm text-ink",
                field.on && "bg-plate-hover",
              )}
            >
              <field.icon className="size-4 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate">{field.name}</span>
              {field.on && <span className="text-sm text-ink-muted tabular-nums">1</span>}
              <ChevronRight className="size-4 shrink-0 text-ink-muted" />
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <span className="inline-flex h-9 max-w-full items-center gap-1.5 justify-self-start rounded-full bg-plate-nested ps-3 pe-2 text-sm font-medium text-ink-secondary">
          <span className="truncate">{t`State: ${learning}`}</span>
          <X className="size-3.5 shrink-0 text-ink-muted" />
        </span>
        <div className="grid rounded-md bg-sheet p-1 edge-drop">
          {values.map((value) => (
            <span
              key={value.name}
              className={clsx(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink",
                value.chosen && "bg-plate-hover",
              )}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {value.chosen && <Check className="size-4" strokeWidth={2.4} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{value.name}</span>
              <span className="text-sm text-ink-muted tabular-nums">{value.cards}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
