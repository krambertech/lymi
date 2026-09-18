import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ApiError } from "../lib/api";
import { useDocumentTitle } from "../lib/document-title";
import { exploreDeckQuery } from "../lib/queries";
import { useAddPublishedDeck } from "../lib/use-add-published-deck";
import { ExploreDeckView } from "../views/explore-deck-view";

export const Route = createFileRoute("/explore/$slug")({
  component: ExploreDeck,
});

function ExploreDeck() {
  const { slug } = Route.useParams();
  const { data, error, isError, isFetching, refetch } = useQuery(exploreDeckQuery(slug));
  useDocumentTitle(data?.deck.name);
  // The learner opened this deck on purpose, so adding it takes them to it.
  const add = useAddPublishedDeck({ land: "library" });
  return (
    <ExploreDeckView
      data={data}
      failed={isError && data === undefined}
      missing={error instanceof ApiError && error.status === 404}
      busy={isFetching}
      onRetry={() => void refetch()}
      onAdd={() => data && add.mutate({ slug, name: data.deck.name })}
      adding={add.isPending}
    />
  );
}
