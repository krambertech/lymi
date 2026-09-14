import { Plural, Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Link2 } from "lucide-react";
import { useId, useState } from "react";

/** A deck's sharing settings: one join link, and a switch that stops new people joining. */
export function JoinLinkDemo() {
  const [on, setOn] = useState(true);
  const labelId = useId();

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-plate p-5 edge @2xl:p-6">
      <div className="relative flex items-start gap-3">
        <span className="grid flex-1 gap-0.5">
          <span id={labelId} className="text-md font-medium text-text">
            <Trans>Join link</Trans>
          </span>
          <span className="text-sm text-muted">
            {on ? (
              <Trans>Anyone with the link can join this deck.</Trans>
            ) : (
              <Trans>The link is off. Nobody new can join.</Trans>
            )}
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={labelId}
          onClick={() => setOn((v) => !v)}
          // Stretched over the row, so a tap on the label flips the switch too.
          className="mt-0.5 shrink-0 rounded-full after:absolute after:inset-0 after:content-['']"
        >
          <span
            className={clsx(
              "flex h-[26px] w-11 items-center rounded-full p-[3px] transition-colors duration-200 ease-out",
              on ? "bg-amber" : "bg-plate-2 edge-2",
            )}
          >
            <span
              className={clsx(
                "size-5 rounded-full transition-transform duration-200 ease-out",
                on ? "translate-x-[18px] bg-amber-ink rtl:-translate-x-[18px]" : "bg-plate edge-2",
              )}
            />
          </span>
        </button>
      </div>

      <div
        aria-hidden={!on}
        className={clsx(
          "mt-4 flex h-11 items-center gap-2.5 rounded-md bg-plate-2 px-3.5 transition-opacity duration-200",
          !on && "opacity-40",
        )}
      >
        <Link2 aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-text-2">
          my.lymi.app/join/k7Qm2x
        </span>
        <span className="shrink-0 text-sm font-medium text-text">
          <Trans>Copy</Trans>
        </span>
      </div>

      <div className="mt-6 border-t border-edge pt-4">
        <p className="text-sm text-text-2 tabular-nums">
          <Plural value={12} one="# learner joined" other="# learners joined" />
        </p>
      </div>
    </div>
  );
}
