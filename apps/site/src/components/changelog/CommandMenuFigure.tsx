import { Trans } from "@lingui/react/macro";
import { CornerDownLeft, Plus, RectangleHorizontal, Search } from "lucide-react";
import { Kbd } from "../Kbd";

const CARDS = [
  { term: "venta", meaning: <Trans>sale</Trans> },
  { term: "ventaja", meaning: <Trans>advantage</Trans> },
];

/** The ⌘K menu with a term typed: cards it found, and the add bar offering to add the term now. */
export function CommandMenuFigure() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-[440px] overflow-hidden rounded-xl bg-sheet edge-strong shadow-[0_12px_32px_-12px_oklch(0.2_0.03_60/0.35)]"
    >
      <div className="flex h-14 items-center gap-3 border-b border-edge px-4">
        <Search className="size-5 text-ink-muted" />
        <span lang="es" className="flex-1 text-lg text-ink">
          ventana
          <span className="ms-px inline-block h-5 w-px translate-y-0.5 bg-ink" />
        </span>
        <Kbd>esc</Kbd>
      </div>
      <div className="px-2 py-2">
        <p className="px-2 pt-1 pb-1.5 text-xs text-ink-muted">
          <Trans>Cards</Trans>
        </p>
        {CARDS.map((card) => (
          <p key={card.term} className="flex items-center gap-3 rounded-md px-2 py-2 text-base">
            <RectangleHorizontal className="size-4 shrink-0 text-ink" />
            <span className="min-w-0 flex-1 truncate">
              <span lang="es" className="font-medium text-ink">
                {card.term}
              </span>
              <span className="text-ink-muted"> · {card.meaning}</span>
            </span>
            <span className="shrink-0 text-sm text-ink-muted">Spanish</span>
          </p>
        ))}
      </div>
      <div className="flex min-h-14 items-center gap-3 border-t border-edge bg-plate-hover px-4 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amber text-amber-ink">
          <Plus className="size-4" strokeWidth={2.5} />
        </span>
        <span className="flex min-w-0 flex-1 text-base">
          <span lang="es" className="font-medium text-ink">
            ventana
          </span>
          <span className="ps-1.5 text-ink-muted">→ Spanish</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
          <Kbd>⌘</Kbd>
          <Kbd>
            <CornerDownLeft className="size-3" />
          </Kbd>
          <Trans>Add now</Trans>
        </span>
      </div>
    </div>
  );
}
