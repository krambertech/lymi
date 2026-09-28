import { useLingui } from "@lingui/react/macro";
import type { ShelfKind } from "@lymi/core/catalog";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useDocumentTitle } from "../lib/document-title";
import { exploreQuery } from "../lib/queries";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { ExploreShelfView } from "../views/explore-shelf-view";

export const Route = createFileRoute("/explore/$kind/$name")({
  component: ExploreShelf,
});

function ExploreShelf() {
  const { t } = useLingui();
  const { kind, name } = Route.useParams();
  useDocumentTitle(t`Explore`);
  const { data, isError, isFetching, refetch } = useQuery(exploreQuery);
  // Browsing, as on Explore, so a press adds the deck and leaves the learner on the shelf.
  const add = useAddPublishedDeck({ announce: "toast" });
  return (
    <ExploreShelfView
      route={{ kind: kind as ShelfKind, name }}
      data={data}
      failed={isError && data === undefined}
      busy={isFetching}
      onRetry={() => void refetch()}
      onAdd={(deck) => add.mutate(deck)}
      adding={add.isPending ? add.variables?.slug : undefined}
    />
  );
}
