import { Trans } from "@lingui/react/macro";
import { Lantern } from "../Lantern";
import { AppTile } from "../Logo";

const BEZEL = "oklch(0.17 0.008 60)";

/** An iPhone's Home Screen at night: Lymi's Lantern widget with what is due, and the app's icon. */
export function IPhoneFigure() {
  return (
    <div aria-hidden="true" className="relative h-[412px] w-[660px] overflow-hidden">
      <div
        className="absolute start-1/2 top-11 h-[520px] w-[296px] -translate-x-1/2 rounded-[50px] p-3 shadow-[0_0_0_1px_oklch(0.32_0.008_60),0_24px_48px_-20px_oklch(0.2_0.03_60/0.5)]"
        style={{ background: BEZEL }}
      >
        <div data-theme="dark" className="relative h-full overflow-hidden rounded-[39px] bg-canvas">
          <div className="flex h-12 items-center justify-between px-8 text-sm font-semibold text-ink">
            <span className="tabular-nums">9:41</span>
            <span className="h-6 w-[80px] rounded-full" style={{ background: BEZEL }} />
            <span className="w-[34px]" />
          </div>
          <div
            className="mx-4 mt-3 flex h-[124px] items-center gap-3 rounded-[24px] bg-plate ps-2.5 pe-3.5 edge"
            style={{
              backgroundImage:
                "radial-gradient(110px 110px at 22% 50%, var(--lantern-glow), transparent 80%)",
            }}
          >
            <Lantern glow className="size-[84px] shrink-0" />
            <div className="flex h-full min-w-0 flex-col py-3.5">
              <span className="text-[36px] leading-none font-medium tabular-nums text-ink">12</span>
              <span className="mt-1 text-[13px] leading-tight text-ink-muted">
                <Trans>cards due</Trans>
              </span>
              <span className="mt-auto pt-1 text-xs font-medium text-ink-muted">
                <Trans>5 days in a row</Trans>
              </span>
            </div>
          </div>
          <div className="ms-[26px] mt-5 grid w-fit justify-items-center gap-1.5">
            <AppTile size={62} />
            <span className="text-xs text-ink">Lymi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
