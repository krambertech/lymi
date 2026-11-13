import { Trans } from "@lingui/react/macro";
import { ArrowDown, BookOpen } from "lucide-react";

/** A word highlighted in a book, and the card it becomes. */
export function HighlightCardFigure() {
  return (
    <div aria-hidden="true" className="mx-auto grid max-w-[360px] justify-items-center gap-2">
      <div className="w-full rounded-xl bg-plate p-4 edge">
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <BookOpen className="size-3.5" />
          Readwise
        </p>
        <p lang="es" className="mt-2.5 text-lg leading-relaxed text-ink-secondary">
          Abrió la <mark className="rounded-xs bg-amber px-0.5 text-amber-ink">ventana</mark> y miró
          el mar.
        </p>
      </div>
      <ArrowDown className="size-4 text-ink-muted" />
      <div className="w-full rounded-xl bg-plate px-4 py-3 edge">
        <p lang="es" className="text-2xl font-medium text-ink">
          ventana
        </p>
        <p className="mt-0.5 text-md text-ink-secondary">
          <Trans>window</Trans>
        </p>
      </div>
    </div>
  );
}
