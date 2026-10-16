import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, ClipboardCheck, Languages, Shapes } from "lucide-react";
import type { ReactNode } from "react";

function Purpose({ icon, label, chosen }: { icon: ReactNode; label: ReactNode; chosen?: boolean }) {
  return (
    <div
      className={clsx(
        "relative flex flex-col gap-2.5 rounded-lg bg-plate p-3 edge",
        chosen && "shadow-[0_0_0_2px_var(--text)]",
      )}
    >
      <span className="text-text-2 [&_svg]:size-5 [&_svg]:stroke-[1.6]">{icon}</span>
      <span className="text-sm leading-snug font-medium text-balance text-text">{label}</span>
      {chosen && (
        <span className="absolute end-2.5 top-2.5 grid size-4.5 place-items-center rounded-full bg-text text-canvas">
          <Check className="size-3" strokeWidth={2.6} />
        </span>
      )}
    </div>
  );
}

function Field({ label, on }: { label: ReactNode; on?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-sm text-text">
      <span
        className={clsx(
          "grid size-4 shrink-0 place-items-center rounded-[4px]",
          on ? "bg-text text-canvas" : "bg-canvas edge-2",
        )}
      >
        {on && <Check className="size-3" strokeWidth={3} />}
      </span>
      {label}
    </span>
  );
}

/** A language deck's settings: what it is for, the fields AI fills, and the owner's instructions. */
export function DeckAiFigure() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px]">
      <p className="text-sm font-medium text-text">
        <Trans>What it’s for</Trans>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Purpose
          icon={<Languages />}
          label={<Trans context="deck purpose">A language</Trans>}
          chosen
        />
        <Purpose icon={<ClipboardCheck />} label={<Trans>A subject or exam</Trans>} />
        <Purpose icon={<Shapes />} label={<Trans>Something else</Trans>} />
      </div>
      <div className="mt-4 grid gap-4 rounded-lg bg-plate p-4 edge">
        <div>
          <p className="text-sm font-medium text-text">
            <Trans>Fields AI can fill</Trans>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Field label={<Trans>Meaning</Trans>} on />
            <Field label={<Trans>Example</Trans>} on />
            <Field label={<Trans>Notes</Trans>} />
            <Field label={<Trans>Pronunciation</Trans>} />
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-text">
            <Trans>Instructions</Trans>
          </p>
          <p className="mt-1.5 rounded-md bg-canvas px-3 py-2.5 text-sm text-text edge-2">
            <Trans>Medical French for nurses. Use the clinical meaning.</Trans>
          </p>
        </div>
      </div>
    </div>
  );
}
