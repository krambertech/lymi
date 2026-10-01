import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { productLinks, type ViewCard, type ViewSearchResult } from "../../../shared/mcp-app";
import { Button } from "../../components/button";
import { DueCount } from "../../components/due-count";
import { InlineError } from "../../components/inline-error";
import { Input } from "../../components/ui/input";
import { CardList, type ListedCard } from "../card-list";
import { useHost } from "../host";
import { ViewFrame } from "../view-frame";

export interface HomeResult {
  dueNow: number;
  decks: { id: string; name: string; due: number }[];
  recent: ListedCard[];
}

/** A search waits this long after the last keystroke, so typing a word is one tool call. */
const SEARCH_DELAY_MS = 300;

/**
 * Lymi's home in ChatGPT's sidebar and beside a conversation: what is due, a search, and the
 * newest cards. Review opens in Lymi, as everywhere else in the assistant.
 */
export function HomeView({ result }: { result: HomeResult }) {
  const { t } = useLingui();
  const host = useHost();
  const links = productLinks(host.origin);
  const [recent, setRecent] = useState<ListedCard[]>(result.recent);
  const [query, setQuery] = useState("");
  const found = useSearch(query);
  const decks = result.decks.filter((d) => d.due > 0).sort((a, b) => b.due - a.due);
  const replace = (saved: ViewCard) =>
    setRecent((list) =>
      list.map((c) => (c.id === saved.id ? { ...saved, deckName: c.deckName } : c)),
    );

  const title =
    result.dueNow === 0
      ? t`Nothing due right now`
      : plural(result.dueNow, { one: "# card due", other: "# cards due" });

  return (
    <ViewFrame
      title={title}
      action={
        <Button
          size="sm"
          variant={result.dueNow > 0 ? "primary" : "secondary"}
          onClick={() => host.open(result.dueNow > 0 ? links.review() : links.today())}
        >
          {result.dueNow > 0 ? <Trans>Review in Lymi</Trans> : <Trans>Open Lymi</Trans>}
          <ExternalLink data-icon="inline-end" aria-hidden="true" />
        </Button>
      }
    >
      {decks.length > 0 && (
        <ul aria-label={t`Due by deck`} className="flex flex-wrap gap-2">
          {decks.map((deck) => (
            <li
              key={deck.id}
              className="inline-flex items-center gap-2 rounded-full bg-plate-2 py-1 ps-3 pe-1 text-sm text-text-2"
            >
              {deck.name}
              <DueCount>{deck.due}</DueCount>
            </li>
          ))}
        </ul>
      )}

      <div className="relative pt-2">
        <Search
          className="pointer-events-none absolute start-3 top-[calc(50%+4px)] size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t`Search your cards`}
          aria-label={t`Search your cards`}
          autoComplete="off"
          inputSize="sm"
          className="ps-9"
        />
      </div>

      <section className="flex flex-col gap-1" aria-live="polite">
        {query.trim() ? (
          found.state === "error" ? (
            <InlineError className="px-2 text-sm">
              <Trans>Couldn’t search your cards. Try again in a moment.</Trans>
            </InlineError>
          ) : found.state === "done" && found.cards.length === 0 ? (
            <p className="px-2 text-sm text-muted">
              <Trans>No cards match “{query}”.</Trans>
            </p>
          ) : (
            <CardList cards={found.cards} label={t`Cards found`} showDeck />
          )
        ) : (
          <>
            <h2 className="px-2 text-sm font-medium text-text-2">
              <Trans>Newest cards</Trans>
            </h2>
            {recent.length === 0 ? (
              <p className="px-2 text-sm text-muted">
                <Trans>Cards you add show up here.</Trans>
              </p>
            ) : (
              <CardList cards={recent} label={t`Newest cards`} showDeck onSaved={replace} />
            )}
          </>
        )}
      </section>
    </ViewFrame>
  );
}

type Found = { state: "idle" | "searching" | "done" | "error"; cards: ListedCard[] };

function useSearch(query: string): Found {
  const host = useHost();
  const [found, setFound] = useState<Found>({ state: "idle", cards: [] });
  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setFound({ state: "idle", cards: [] });
      return;
    }
    let current = true;
    setFound((f) => ({ ...f, state: "searching" }));
    const timer = window.setTimeout(async () => {
      const page = await host.call<ViewSearchResult>("search_cards", { query: text, limit: 20 });
      if (!current) return;
      setFound(page.ok ? { state: "done", cards: page.data.cards } : { state: "error", cards: [] });
    }, SEARCH_DELAY_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [query, host]);
  return found;
}
