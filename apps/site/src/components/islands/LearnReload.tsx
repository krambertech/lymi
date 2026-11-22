import { Trans } from "@lingui/react/macro";
import { useSyncExternalStore } from "react";
import { loadFailed, subscribeToLoadFailure } from "../../lib/learn/load-failure";
import { Button } from "../Button";
import { Localized } from "../Localized";

function Notice() {
  const failed = useSyncExternalStore(subscribeToLoadFailure, loadFailed, () => false);
  if (!failed) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="alert"
        className="edge-lift flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg bg-plate px-4 py-3 text-ink"
      >
        <p>
          <Trans>The sounds and exercises didn’t load.</Trans>
        </p>
        <Button size="sm" onClick={() => window.location.reload()}>
          <Trans>Reload the page</Trans>
        </Button>
      </div>
    </div>
  );
}

export default function LearnReload({ locale }: { locale: string }) {
  return (
    <Localized locale={locale}>
      <Notice />
    </Localized>
  );
}
