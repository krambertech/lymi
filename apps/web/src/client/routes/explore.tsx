import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useDocumentTitle } from "../lib/document-title";
import { exploreQuery } from "../lib/queries";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
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
  // Browsing, so a press adds the deck and leaves the shelf where it is.
  const add = useAddPublishedDeck({ announce: "toast" });
  return (
    <ExploreView
      data={data}
      failed={isError && data === undefined}
      busy={isFetching}
      onRetry={() => void refetch()}
      onAdd={(deck) => add.mutate(deck)}
      adding={add.isPending ? add.variables?.slug : undefined}
    />
  );
}
