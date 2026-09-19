import { useLingui } from "@lingui/react/macro";
import { useEffect, useSyncExternalStore } from "react";

let screenName: string | undefined;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The name the open screen gave itself, for a place over it whose back names the screen under it. */
export function useScreenName(): string | undefined {
  return useSyncExternalStore(subscribe, () => screenName);
}

/** Names the browser tab after the screen; until the name is known, the tab says Lymi. */
export function useDocumentTitle(name: string | undefined) {
  const { t } = useLingui();
  const title = name ? t`${name} · Lymi` : "Lymi";
  useEffect(() => {
    document.title = title;
    screenName = name;
    for (const notify of listeners) notify();
  }, [title, name]);
}
