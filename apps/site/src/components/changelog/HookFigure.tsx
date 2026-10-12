import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Anchor, BookOpen, Brain, Check, Lock, RotateCcw, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { Kbd } from "../Kbd";

interface Props {
  /** `peek` shows the hook under the cue before the answer; `write` drafts one under the answer. */
  variant: "peek" | "write";
}

/** A review card with its memory hook, peeked before the answer or written after it. */
export function HookFigure({ variant }: Props) {
  const peek = variant === "peek";
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px]">
      <div className="rounded-xl bg-plate p-5 edge">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <BookOpen className="size-3.5" />
          Estonian A2
        </p>
        <p className="mt-7 text-2xl font-medium tracking-[-0.02em] text-text">
          <Trans>to look, to watch</Trans>
        </p>
        {peek ? (
          <p className="mt-3 flex items-start gap-2 text-sm text-text-2">
            <Anchor className="mt-0.5 size-4 shrink-0" />
            <Trans>“Look at that VAT, MAma!”</Trans>
          </p>
        ) : (
          <>
            <div className="my-4 h-px bg-edge" />
            <p lang="et" className="text-2xl font-medium tracking-[-0.02em] text-text">
              vaatama
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-plate-2 px-3 py-2.5">
              <Anchor className="size-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate text-sm text-faint">
                <Trans>“Look at that VAT, MAma!”</Trans>
              </span>
              <Kbd>Tab</Kbd>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Grade icon={<RotateCcw className="text-grade-forgot" />} label={<Trans>Forgot</Trans>} />
        <Grade icon={<Brain className="text-grade-hard" />} label={<Trans>Hard</Trans>} />
        <Grade icon={<Check className="text-grade-good" />} label={<Trans>Good</Trans>} />
        <Grade
          icon={peek ? <Lock className="text-muted" /> : <Zap className="text-grade-easy" />}
          label={<Trans>Easy</Trans>}
          off={peek}
        />
      </div>
    </div>
  );
}

function Grade({ icon, label, off }: { icon: ReactNode; label: ReactNode; off?: boolean }) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-1 rounded-lg bg-plate py-2.5 text-xs text-text-2 edge [&_svg]:size-4",
        off && "opacity-45",
      )}
    >
      {icon}
      {label}
    </div>
  );
}
