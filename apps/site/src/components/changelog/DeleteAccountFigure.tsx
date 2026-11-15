import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { ReactNode } from "react";

function Count({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="grid gap-0.5 rounded-lg bg-plate px-4 py-3 edge">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-lg font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}

/** The Delete account page: what goes, the deck that stays for its members, and the emailed code. */
export function DeleteAccountFigure() {
  const { i18n } = useLingui();
  return (
    <div aria-hidden="true" className="mx-auto max-w-[400px]">
      <p className="text-md font-medium text-ink">
        <Trans>What goes</Trans>
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Count label={<Trans>Decks</Trans>} value={i18n.number(4)} />
        <Count label={<Trans>Cards</Trans>} value={i18n.number(1240)} />
        <Count label={<Trans>Reviews</Trans>} value={i18n.number(16402)} />
      </div>
      <p className="mt-5 text-md font-medium text-ink">
        <Trans>What stays for others</Trans>
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4 rounded-lg bg-plate px-4 py-3 edge">
        <span className="min-w-0 truncate text-base text-ink">Estonian A2</span>
        <span className="shrink-0 text-sm text-ink-muted">
          <Plural value={3} one="# person" other="# people" />
        </span>
      </div>
      <p className="mt-5 text-md font-medium text-ink">
        <Trans>Confirm it’s you</Trans>
      </p>
      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-10 flex-1 items-center rounded-md bg-canvas px-3 text-base tracking-[0.2em] text-ink tabular-nums edge-strong">
          482913
        </span>
        <span className="inline-flex h-10 items-center rounded-md bg-danger-soft px-4 text-base font-medium text-danger">
          <Trans>Delete account</Trans>
        </span>
      </div>
    </div>
  );
}
