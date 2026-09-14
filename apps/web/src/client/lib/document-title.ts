import { useLingui } from "@lingui/react/macro";
import { useEffect } from "react";

/** Names the browser tab after the screen; until the name is known, the tab says Lymi. */
export function useDocumentTitle(name: string | undefined) {
  const { t } = useLingui();
  const title = name ? t`${name} · Lymi` : "Lymi";
  useEffect(() => {
    document.title = title;
  }, [title]);
}
