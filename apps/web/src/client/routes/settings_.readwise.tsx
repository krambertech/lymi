import { useLingui } from "@lingui/react/macro";
import { languageKey } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "../components/ui/toast";
import { api, type Readwise, refusalCode } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { decksQuery, readwiseQuery } from "../lib/queries";
import { ReadwiseView } from "../views/readwise-view";

export const Route = createFileRoute("/settings_/readwise")({
  component: ReadwiseRoute,
});

function ReadwiseRoute() {
  const { t } = useLingui();
  useDocumentTitle(t`Readwise`);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const state = useQuery(readwiseQuery);
  const decks = useQuery(decksQuery);
  const settle = (next: { connection: Readwise | null }) =>
    qc.setQueryData(readwiseQuery.queryKey, next);

  const connect = useMutation({ mutationFn: api.connectReadwise, onSuccess: settle });
  const update = useMutation({
    mutationFn: api.updateReadwise,
    // A switch moves on the tap and moves back if the server refuses.
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: readwiseQuery.queryKey });
      const previous = qc.getQueryData(readwiseQuery.queryKey);
      const connection = previous?.connection;
      if (connection) {
        const follows = new Map((patch.books ?? []).map((b) => [b.id, b.followed]));
        settle({
          connection: {
            ...connection,
            books: connection.books.map((b) => ({
              ...b,
              followed: follows.get(b.id) ?? b.followed,
            })),
            languages: connection.languages.map((l) => ({
              ...l,
              deckId: patch.decks?.[l.language] ?? l.deckId,
            })),
          },
        });
      }
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) settle(context.previous);
    },
    onSuccess: settle,
  });
  const pull = useMutation({
    mutationFn: api.pullReadwise,
    onSuccess: (next) => {
      settle(next);
      void qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
  const disconnect = useMutation({
    mutationFn: api.disconnectReadwise,
    onSuccess: async () => {
      settle({ connection: null });
      await navigate({ to: "/settings", hash: "other-apps" });
      toast.add({ title: t`Readwise is disconnected` });
    },
  });

  const connectError = (error: unknown) =>
    refusalCode(error) === "readwise_refused"
      ? t`Readwise didn’t accept that token. Copy it again from readwise.io/access_token.`
      : t`Couldn’t reach Readwise. Check your connection and try again.`;

  return (
    <ReadwiseView
      connection={state.isSuccess ? state.data.connection : undefined}
      loadError={state.isError}
      onRetry={() => void state.refetch()}
      decks={(decks.data ?? []).flatMap((d) =>
        d.role === "owner" && !d.archivedAt && d.defaultLanguage
          ? [{ id: d.id, name: d.name, language: languageKey(d.defaultLanguage) }]
          : [],
      )}
      onConnect={(token) => connect.mutate(token)}
      connecting={connect.isPending}
      connectError={connect.isError ? connectError(connect.error) : null}
      onFollow={(id, followed) => update.mutate({ books: [{ id, followed }] })}
      onDeck={(language, deckId) => update.mutate({ decks: { [language]: deckId } })}
      saveError={
        update.isError ? t`Couldn’t save that change. Check your connection and try again.` : null
      }
      onPull={() => {
        if (!pull.isPending) pull.mutate();
      }}
      pulling={pull.isPending}
      pullError={pull.isError ? t`Couldn’t reach Readwise. Try again in a minute.` : null}
      onDisconnect={() => disconnect.mutate()}
      disconnecting={disconnect.isPending}
    />
  );
}
