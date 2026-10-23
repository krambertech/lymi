import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api, errorMessage } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { productUrl, publicSiteUrl } from "../lib/origins";
import { keysQuery } from "../lib/queries";
import { YOMITAN_KEY_NAME, yomitanKey } from "../lib/yomitan";
import { YomitanView } from "../views/yomitan-view";

export const Route = createFileRoute("/settings_/yomitan")({
  component: YomitanRoute,
});

function YomitanRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Yomitan`);
  const qc = useQueryClient();
  const keys = useQuery(keysQuery);
  const current = keys.isSuccess ? yomitanKey(keys.data) : undefined;
  // A new key replaces the one this page shows, so a key thought leaked stops working.
  const make = useMutation({
    mutationFn: async (replacing: string | null) => {
      const made = await api.createKey({ name: YOMITAN_KEY_NAME, scope: "write" });
      // The new key is shown once whatever happens to the old one, which can be revoked by hand.
      const kept = replacing
        ? await api.revokeKey(replacing).then(
            () => false,
            () => true,
          )
        : false;
      return { ...made, kept };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keysQuery.queryKey }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: () => {
      make.reset();
      void qc.invalidateQueries({ queryKey: keysQuery.queryKey });
    },
  });
  const failed = make.error ?? revoke.error ?? (keys.isError ? keys.error : null);
  const error = failed
    ? errorMessage(failed)
    : make.data?.kept
      ? t`Couldn’t revoke the old key. Revoke it under API keys in Settings.`
      : null;

  return (
    <YomitanView
      address={productUrl("/api/anki-connect")}
      guide={publicSiteUrl("/docs/yomitan")}
      current={current}
      fresh={
        make.data
          ? { id: make.data.id, key: make.data.key, name: make.data.name ?? YOMITAN_KEY_NAME }
          : null
      }
      onMake={() => make.mutate(current?.id ?? null)}
      making={make.isPending}
      onDone={() => make.reset()}
      onRevoke={(id) => revoke.mutate(id)}
      error={error}
    />
  );
}
