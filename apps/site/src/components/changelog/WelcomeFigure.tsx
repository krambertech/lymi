import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ClipboardCheck, Globe, Languages, Shapes } from "lucide-react";
import type { ReactNode } from "react";

function Tile({ icon, title, chosen }: { icon: ReactNode; title: ReactNode; chosen?: boolean }) {
  return (
    <div
      className={clsx(
        "relative flex flex-col gap-3 rounded-xl bg-plate p-4 edge",
        chosen && "shadow-[0_0_0_2px_var(--ink)]",
      )}
    >
      <span className="text-ink-secondary [&_svg]:size-6 [&_svg]:stroke-[1.6]">{icon}</span>
      <span className="text-base font-medium text-ink">{title}</span>
      {chosen && (
        <span className="absolute end-3 top-3 grid size-5 place-items-center rounded-full bg-ink text-canvas">
          <Check className="size-3.5" strokeWidth={2.4} />
        </span>
      )}
    </div>
  );
}

/** Welcome's first question, as a new account sees it. */
export function WelcomeFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px]">
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-plate-nested">
        <div className="h-full w-1/3 rounded-full bg-ink" />
      </div>
      <p className="text-xl font-medium tracking-[-0.02em] text-ink">
        <Trans>What are you learning?</Trans>
      </p>
      <p className="mt-1 text-sm text-ink-secondary">
        <Trans>Lymi works for anything you want to remember.</Trans>
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Tile icon={<Languages />} title={<Trans>A language</Trans>} chosen />
        <Tile icon={<ClipboardCheck />} title={<Trans>For a test</Trans>} />
        <Tile icon={<Globe />} title={<Trans>A subject</Trans>} />
        <Tile icon={<Shapes />} title={<Trans>Something else</Trans>} />
      </div>
    </div>
  );
}
