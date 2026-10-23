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
  const make = useMutation({
    mutationFn: () => api.createKey({ name: YOMITAN_KEY_NAME, scope: "write" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keysQuery.queryKey }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.revokeKey(id),
    onSuccess: () => {
      make.reset();
      void qc.invalidateQueries({ queryKey: keysQuery.queryKey });
    },
  });
  const failed = make.error ?? revoke.error ?? (keys.isError ? keys.error : null);

  return (
    <YomitanView
      address={productUrl("/api/anki-connect")}
      guide={publicSiteUrl("/docs/yomitan")}
      current={keys.isSuccess ? yomitanKey(keys.data) : undefined}
      fresh={
        make.data
          ? { id: make.data.id, key: make.data.key, name: make.data.name ?? YOMITAN_KEY_NAME }
          : null
      }
      onMake={() => make.mutate()}
      making={make.isPending}
      onDone={() => make.reset()}
      onRevoke={(id) => revoke.mutate(id)}
      error={failed ? errorMessage(failed) : null}
    />
  );
}
