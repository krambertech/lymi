import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { isolate, tagKey } from "@lymi/core";
import {
  Archive,
  Merge,
  MoreHorizontal,
  PencilLine,
  RotateCcw,
  Search,
  Tag as TagIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button, IconButton } from "../components/button";
import { EmptySection, ErrorState } from "../components/empty-state";
import { Screen } from "../components/layout/screen";
import { Skeleton } from "../components/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import type { DeckTags } from "../lib/api";

type DeckTag = DeckTags["tags"][number];

interface Props {
  deckId: string;
  tags: DeckTags | undefined;
  failed?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  onRename: (tag: DeckTag) => void;
  onMerge: (tag: DeckTag) => void;
  onArchive: (tag: DeckTag) => void;
  onRestore: (tag: DeckTag) => void;
  /** The archived tag being restored, so its row waits. */
  restoring?: string | undefined;
}

/** One deck's tags, reached from its settings: each in use with a menu, then the archived ones. */
export function DeckTagsView({
  deckId,
  tags,
  failed,
  onRetry,
  retrying,
  onRename,
  onMerge,
  onArchive,
  onRestore,
  restoring,
}: Props) {
  const { t } = useLingui();
  const [query, setQuery] = useState("");
  const needle = tagKey(query);
  const shown = tags?.tags.filter((tag) => tagKey(tag.name).includes(needle)) ?? [];
  const archived = tags?.archived.filter((tag) => tagKey(tag.name).includes(needle)) ?? [];
  const nothing = tags && tags.tags.length === 0 && tags.archived.length === 0;

  return (
    <Screen
      title={t`Tags`}
      sub={t`The tags on this deck’s cards. Changes here stay in this deck.`}
      width="md"
      backOnDesktop
      back={{ label: t`Settings`, to: "/library/$deckId/settings", params: { deckId } }}
    >
      {failed && !tags ? (
        <ErrorState title={t`Couldn’t load tags`} onRetry={onRetry} retrying={retrying} />
      ) : !tags ? (
        <div className="grid gap-2">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : nothing ? (
        <EmptySection
          icon={<TagIcon />}
          title={t`No tags yet`}
          body={t`Tags you put on this deck’s cards show here, to rename, merge or archive.`}
        />
      ) : (
        <div className="grid gap-8">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t`Find a tag`}
              aria-label={t`Find a tag`}
              autoComplete="off"
              enterKeyHint="search"
              className="ps-9"
            />
          </div>
          {tags.tags.length > 0 && (
            <Group heading={<Trans>In use</Trans>} id="tags-in-use">
              {shown.map((tag) => (
                <TagRow key={tagKey(tag.name)} tag={tag}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <IconButton size="sm" label={t`Options for ${isolate(tag.name)}`}>
                          <MoreHorizontal />
                        </IconButton>
                      }
                    />
                    <DropdownMenuContent
                      aria-label={t`Options for ${isolate(tag.name)}`}
                      align="end"
                    >
                      <DropdownMenuItem onClick={() => onRename(tag)}>
                        <PencilLine />
                        <Trans>Rename…</Trans>
                      </DropdownMenuItem>
                      {tags.tags.length > 1 && (
                        <DropdownMenuItem onClick={() => onMerge(tag)}>
                          <Merge />
                          <Trans>Merge into…</Trans>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onArchive(tag)}>
                        <Archive />
                        <Trans>Archive</Trans>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TagRow>
              ))}
              {shown.length === 0 && (
                <li className="px-4 py-3.5 text-base text-muted">
                  <Trans>No tag matches “{{ query: isolate(query) }}”.</Trans>
                </li>
              )}
            </Group>
          )}
          {archived.length > 0 && (
            <Group heading={<Trans>Archived tags</Trans>} id="tags-archived">
              {archived.map((tag) => (
                <TagRow key={tagKey(tag.name)} tag={tag} muted>
                  <Button
                    size="sm"
                    loading={restoring === tag.name}
                    aria-disabled={!!restoring}
                    onClick={() => !restoring && onRestore(tag)}
                  >
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    <Trans>Restore</Trans>
                  </Button>
                </TagRow>
              ))}
            </Group>
          )}
        </div>
      )}
    </Screen>
  );
}

function Group({ heading, id, children }: { heading: ReactNode; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-md font-medium">
        {heading}
      </h2>
      <ul className="edge grid rounded-xl bg-plate">{children}</ul>
    </section>
  );
}

function TagRow({
  tag,
  muted = false,
  children,
}: {
  tag: DeckTag;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex min-h-14 items-center gap-3 border-edge ps-4 pe-2 not-first:border-t">
      <span
        className={
          muted
            ? "min-w-0 flex-1 truncate text-base text-text-2"
            : "min-w-0 flex-1 truncate text-base font-medium"
        }
      >
        {tag.name}
      </span>
      <span className="shrink-0 text-sm text-muted tabular-nums">
        <Plural value={tag.cards} one="# card" other="# cards" />
      </span>
      {children}
    </li>
  );
}
