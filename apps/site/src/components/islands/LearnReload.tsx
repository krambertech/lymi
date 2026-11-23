import { Trans } from "@lingui/react/macro";
import { useSyncExternalStore } from "react";
import {
  loadFailed,
  reloadAfterFailure,
  subscribeToLoadFailure,
} from "../../lib/learn/load-failure";
import { Button } from "../Button";
import { Localized } from "../Localized";

function Notice({ locale }: { locale: string }) {
  const failed = useSyncExternalStore(subscribeToLoadFailure, loadFailed, () => false);
  if (!failed) return null;
  return (
    <div className="pointer-events-none sticky bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="alert"
        lang={locale}
        className="edge-lift pointer-events-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-plate px-4 py-3 text-ink"
      >
        <p>
          <Trans>The sounds and exercises didn’t load.</Trans>
        </p>
        <Button size="sm" onClick={() => void reloadAfterFailure()}>
          <Trans>Reload the page</Trans>
        </Button>
      </div>
    </div>
  );
}

export default function LearnReload({ locale }: { locale: string }) {
  return (
    <Localized locale={locale}>
      <Notice locale={locale} />
    </Localized>
  );
}
