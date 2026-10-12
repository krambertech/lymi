import { Trans } from "@lingui/react/macro";
import { Download, Plus, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

function Row({ icon, title, meta }: { icon: ReactNode; title: ReactNode; meta: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-edge px-4 py-3.5 last:border-b-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-plate-2 text-text-2 [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-medium text-text">{title}</span>
        <span className="block text-sm text-muted">{meta}</span>
      </span>
    </div>
  );
}

/** A day on Activity: what came in from outside the app, and the file that went out. */
export function ActivityFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[420px]">
      <p className="mb-2 px-1 text-sm text-text-2">
        <Trans>Today</Trans>
      </p>
      <div className="overflow-hidden rounded-xl bg-plate edge">
        <Row
          icon={<Plus />}
          title={<Trans>Added 6 cards to Estonian A2</Trans>}
          meta={<Trans>Claude · from your lesson notes</Trans>}
        />
        <Row
          icon={<Sparkles />}
          title={<Trans>Filled in 6 cards in Estonian A2</Trans>}
          meta={<Trans>Lymi’s AI · meanings and examples</Trans>}
        />
        <Row
          icon={<Download />}
          title={<Trans>Exported your library</Trans>}
          meta={<Trans>Anki package · ready for a day</Trans>}
        />
      </div>
    </div>
  );
}
