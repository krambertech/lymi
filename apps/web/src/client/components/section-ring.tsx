import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

export interface SectionRingProps {
  known: number;
  total: number;
  className?: string | undefined;
}

// The pie is a stroke as wide as its own diameter, so a dash of the circumference fills a wedge.
const PIE_R = 1.75;
const PIE = 2 * Math.PI * PIE_R;

/** How much of a section the learner knows, as a ring that fills clockwise and closes with a check. */
export function SectionRing({ known, total, className }: SectionRingProps) {
  const { t, i18n } = useLingui();
  const share = total > 0 ? Math.min(1, known / total) : 0;
  const done = total > 0 && known >= total;
  const knownN = i18n.number(known);

  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label={t`You know ${knownN} of ${plural(total, { one: "# card", other: "# cards" })}`}
      className={clsx(
        "size-4 shrink-0 rtl:-scale-x-100",
        share > 0 ? "text-state-known" : "text-muted",
        className,
      )}
    >
      {done ? (
        <>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path
            d="m5 8.25 2 2 4-4.25"
            fill="none"
            className="stroke-canvas"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle
            cx="8"
            cy="8"
            r={PIE_R}
            fill="none"
            stroke="currentColor"
            strokeWidth={PIE_R * 2}
            strokeDasharray={`${share * PIE} ${PIE}`}
            transform="rotate(-90 8 8)"
            className="transition-[stroke-dasharray] duration-300 ease-out motion-reduce:transition-none"
          />
        </>
      )}
    </svg>
  );
}
