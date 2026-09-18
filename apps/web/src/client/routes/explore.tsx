import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useAddCard } from "../lib/add-card";
import { useDocumentTitle } from "../lib/document-title";
import { publicSiteUrl } from "../lib/origins";
import { exploreQuery, meQuery } from "../lib/queries";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { useSignOut } from "../lib/use-sign-out";
import { ExploreView } from "../views/explore-view";

export const Route = createFileRoute("/explore")({
  component: Explore,
});

/** `/explore/$slug` sits under this route's path, so the deck page takes the screen whole. */
function Explore() {
  const matches = useMatches();
  if (matches.some((m) => m.routeId === "/explore/$slug")) return <Outlet />;
  return <Catalogue />;
}

function Catalogue() {
  const { t } = useLingui();
  useDocumentTitle(t`Explore`);
  const { data, isError, isFetching, refetch } = useQuery(exploreQuery);
  const me = useQuery(meQuery);
  const leave = useSignOut();
  const capture = useAddCard();
  // Browsing, so a press adds the deck and leaves the shelf where it is.
  const add = useAddPublishedDeck({ land: "here" });
  return (
    <ExploreView
      data={data}
      failed={isError && data === undefined}
      busy={isFetching}
      onRetry={() => void refetch()}
      onAdd={(deck) => add.mutate(deck)}
      adding={add.isPending ? add.variables?.slug : undefined}
      name={me.data?.name}
      email={me.data?.email}
      docsUrl={publicSiteUrl("/docs")}
      onAddCard={() => capture.openCard()}
      onCreateDeck={capture.openDeck}
      onSignOut={leave.signOut}
      signingOut={leave.busy}
    />
  );
}
