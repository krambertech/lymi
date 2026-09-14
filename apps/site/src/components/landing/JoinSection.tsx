import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import type { BetaSource } from "../../lib/api";
import { JoinBeta } from "./JoinBeta";

interface Props {
  title: ReactNode;
  source: BetaSource;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

export function JoinSection({ title, source, note }: Props) {
  return (
    <section id="join" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div className="mx-auto grid max-w-[1040px] gap-10 rounded-2xl bg-plate-2 p-7 edge-inset @2xl:p-12 @4xl:grid-cols-[0.9fr_1.1fr] @4xl:items-center @4xl:gap-20 @4xl:p-16">
        <div>
          <h2 className="max-w-[14ch] text-4xl font-medium tracking-[-0.03em] text-balance text-text @2xl:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[44ch] text-md text-text-2">
            <Trans>
              The private beta is free. Leave your email and we’ll write when a place opens.
            </Trans>
          </p>
          {note && <p className="mt-3 max-w-[44ch] text-sm text-muted">{note}</p>}
        </div>
        <JoinBeta source={source} />
      </div>
    </section>
  );
}
