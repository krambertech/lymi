import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, type DeckTags, errorMessage } from "@lymi/client/api";
import { deckTagsQuery, settleDeckTags, tagsQuery } from "@lymi/client/queries";
import { isolate, TAG_LIMITS, tagKey } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { useDecks } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { inputCap } from "../../../theme/type";
import { ActionMenu } from "../../../ui/action-menu";
import { EmptyState } from "../../../ui/empty-state";
import { LoadFailed, useLoadFailed } from "../../../ui/load-failed";
import { SEARCHED_PAST, SearchField, useSearched } from "../../../ui/menu";
import { Button, Plate, SectionTitle, Text } from "../../../ui/primitives";
import { Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Sheet, SheetError, SheetGroup, SheetNote, SheetRow } from "../../../ui/sheet";
import { useSheetFocus } from "../../../ui/sheet-focus";
import { Skeleton } from "../../../ui/skeleton";
import { SwipeActions } from "../../../ui/swipe-actions";
import { toast } from "../../../ui/toast-host";

type DeckTag = DeckTags["tags"][number];

/**
 * A deck's tags, for its owner, as the web's Tags page: each in use with its count, swiping open on
 * Rename and Archive and with Merge into in its ⋯, then the archived ones with Restore. Every change
 * stays in this deck, and renaming onto a name in use merges the two. docs/proposals/tags.md.
 */
export default function DeckTagsPage() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const qc = useQueryClient();
  const query = useQuery({ ...deckTagsQuery(id), enabled: !!id });
  const own = useQuery(tagsQuery).data?.filter((tag) => tag.own) ?? [];
  const loadFailed = useLoadFailed(query);
  const [renaming, setRenaming] = useState<DeckTag | null>(null);
  const [merging, setMerging] = useState<DeckTag | null>(null);
  const [find, setFind] = useState("");

  const tags = query.data?.tags ?? [];
  const needle = tagKey(find);
  const shown = tags.filter((tag) => tagKey(tag.name).includes(needle));
  const archived = (query.data?.archived ?? []).filter((tag) => tagKey(tag.name).includes(needle));
  const inUse = [...own, ...tags];

  const settle = (next: DeckTags) => settleDeckTags(qc, id, next);
  const failed = (e: unknown) => toast.add({ error: true, title: errorMessage(e) });
  // Not this page's mutations: Undo can be pressed after the learner has left the page.
  const renameBack = (from: string, to: string) =>
    void api
      .renameDeckTag(id, { from, to })
      .then(settle)
      .catch((e) => failed(e));
  const restoreQuietly = (tag: DeckTag) =>
    void api
      .restoreDeckTag(id, { name: tag.name })
      .then(settle)
      .catch((e) => failed(e));

  const rename = useMutation({
    // Decided before the write, since the lists it reads change once the rename lands.
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const merge = inUse.some(
        (tag) => tagKey(tag.name) === tagKey(to) && tagKey(tag.name) !== tagKey(from),
      );
      const next = await api.renameDeckTag(id, { from, to });
      await settle(next);
      return { next, merge };
    },
    onSuccess: ({ next, merge }, { from, to }) => {
      const toastId = `rename-tag-${id}`;
      const spelled = next.tags.find((tag) => tagKey(tag.name) === tagKey(to))?.name ?? to;
      // A merge cannot be told apart again, so only a plain rename offers Undo.
      toast.add(
        merge
          ? {
              id: toastId,
              title: t`Merged “${{ from: isolate(from) }}” into “${{ spelled: isolate(spelled) }}”`,
            }
          : {
              id: toastId,
              title: t`Renamed “${{ from: isolate(from) }}” to “${{ spelled: isolate(spelled) }}”`,
              action: {
                label: t`Undo`,
                onPress: () => {
                  toast.close(toastId);
                  renameBack(spelled, from);
                },
              },
            },
      );
    },
  });
  const archive = useMutation({
    mutationFn: (tag: DeckTag) => api.archiveDeckTag(id, { name: tag.name }),
    onSuccess: async (next, tag) => {
      await settle(next);
      const tagName = tag.name;
      toast.add({
        id: `archive-tag-${id}-${tag.name}`,
        title: t`Archived “${{ tagName: isolate(tagName) }}” from ${plural(tag.cards, { one: "# card", other: "# cards" })}`,
        action: { label: t`Undo`, onPress: () => restoreQuietly(tag) },
      });
    },
    onError: failed,
  });
  const restore = useMutation({
    mutationFn: (tag: DeckTag) => api.restoreDeckTag(id, { name: tag.name }),
    onSuccess: async (next, tag) => {
      toast.close(`archive-tag-${id}-${tag.name}`);
      await settle(next);
    },
    onError: failed,
  });

  const back = {
    label: deck?.name ?? t`Deck settings`,
    to: `/library/deck-settings?id=${id}` as Href,
  };
  const title = t`Tags`;
  const description = t`The tags on this deck’s cards. Changes here stay in this deck.`;

  if (!query.data) {
    return (
      <Screen title={title} back={back}>
        {loadFailed ? (
          <LoadFailed
            query={query}
            failed={t`Couldn’t load tags`}
            offline={t`Tags need a connection`}
          />
        ) : (
          <Skeleton height={160} />
        )}
      </Screen>
    );
  }

  const nothing = query.data.tags.length === 0 && query.data.archived.length === 0;
  const searched = query.data.tags.length + query.data.archived.length > SEARCHED_PAST;

  return (
    <Screen
      title={title}
      back={back}
      description={nothing ? undefined : description}
      onRefresh={() => query.refetch()}
    >
      {nothing ? (
        <EmptyState
          kind="start"
          icon="tags"
          title={t`No tags yet`}
          body={t`Tags you put on this deck’s cards show here, to rename, merge or archive.`}
        />
      ) : (
        <>
          {searched && (
            <SearchField
              label={title}
              placeholder={t`Find a tag`}
              query={find}
              onChange={setFind}
              onSubmit={() => {}}
              focus={false}
            />
          )}
          {tags.length > 0 && (
            <View>
              <SectionTitle>{t`In use`}</SectionTitle>
              {shown.length > 0 ? (
                <Rows>
                  {shown.map((tag) => (
                    <TagRow
                      key={tagKey(tag.name)}
                      tag={tag}
                      canMerge={tags.length > 1}
                      onRename={() => setRenaming(tag)}
                      onMerge={() => setMerging(tag)}
                      onArchive={() => archive.mutate(tag)}
                    />
                  ))}
                </Rows>
              ) : (
                <Plate className="px-4 py-3.5">
                  <Text className="text-md text-muted">
                    {t`No tag matches “${{ query: isolate(find.trim()) }}”.`}
                  </Text>
                </Plate>
              )}
            </View>
          )}
          {archived.length > 0 && (
            <View>
              <SectionTitle>{t`Archived tags`}</SectionTitle>
              <Rows>
                {archived.map((tag) => (
                  <ArchivedRow
                    key={tagKey(tag.name)}
                    tag={tag}
                    restoring={restore.isPending && restore.variables?.name === tag.name}
                    waiting={restore.isPending}
                    onRestore={() => restore.mutate(tag)}
                  />
                ))}
              </Rows>
            </View>
          )}
        </>
      )}

      <RenameSheet
        tag={renaming}
        inUse={inUse}
        busy={rename.isPending}
        onClose={() => setRenaming(null)}
        onSubmit={async (to) => {
          if (!renaming) return;
          await rename.mutateAsync({ from: renaming.name, to });
          setRenaming(null);
        }}
      />
      <MergeSheet
        tag={merging}
        tags={tags}
        onClose={() => setMerging(null)}
        onMerge={(from, into) =>
          void rename.mutateAsync({ from: from.name, to: into.name }).catch((e) => failed(e))
        }
      />
    </Screen>
  );
}

/** A tag in use: its name and how many cards carry it, swiping open on Rename and Archive, with all three in its ⋯. */
function TagRow({
  tag,
  canMerge,
  onRename,
  onMerge,
  onArchive,
}: {
  tag: DeckTag;
  canMerge: boolean;
  onRename: () => void;
  onMerge: () => void;
  onArchive: () => void;
}) {
  const { t } = useLingui();
  const name = tag.name;
  const cards = plural(tag.cards, { one: "# card", other: "# cards" });
  return (
    <SwipeActions
      actions={[
        { label: t`Rename`, icon: "edit", onPress: onRename },
        { label: t`Archive`, icon: "archive", destructive: true, onPress: onArchive },
      ]}
    >
      <View className="min-h-14 flex-row items-center gap-3 bg-plate py-2 ps-4 pe-3">
        <View
          className="flex-1 flex-row items-center gap-3"
          accessible
          accessibilityLabel={t`${{ name: isolate(name) }}, ${cards}`}
          accessibilityActions={[
            { name: "rename", label: t`Rename` },
            ...(canMerge ? [{ name: "merge", label: t`Merge into…` }] : []),
            { name: "archive", label: t`Archive` },
          ]}
          onAccessibilityAction={(e) => {
            const action = e.nativeEvent.actionName;
            if (action === "rename") onRename();
            if (action === "merge") onMerge();
            if (action === "archive") onArchive();
          }}
        >
          <Text className="flex-1 text-md font-medium text-text" numberOfLines={1}>
            {name}
          </Text>
          <Text className="text-base text-muted">{cards}</Text>
        </View>
        <ActionMenu
          label={t`Options for ${{ name: isolate(name) }}`}
          symbol="ellipsis"
          look="row"
          items={[
            [
              { label: t`Rename…`, icon: "edit", onSelect: onRename },
              ...(canMerge
                ? [{ label: t`Merge into…`, icon: "move" as const, onSelect: onMerge }]
                : []),
            ],
            [{ label: t`Archive`, icon: "archive", destructive: true, onSelect: onArchive }],
          ]}
        />
      </View>
    </SwipeActions>
  );
}

/** An archived tag, quieter than those in use, with Restore at its end. */
function ArchivedRow({
  tag,
  restoring,
  waiting,
  onRestore,
}: {
  tag: DeckTag;
  restoring: boolean;
  /** Another restore is under way, so this one waits rather than cross it. */
  waiting: boolean;
  onRestore: () => void;
}) {
  const { t } = useLingui();
  return (
    <View className="min-h-14 flex-row items-center gap-3 py-2 ps-4 pe-3">
      <Text className="flex-1 text-md text-text-2" numberOfLines={1}>
        {tag.name}
      </Text>
      <Text className="text-base text-muted">
        {plural(tag.cards, { one: "# card", other: "# cards" })}
      </Text>
      <Button
        label={t`Restore`}
        size="sm"
        loading={restoring}
        disabled={waiting && !restoring}
        onPress={onRestore}
      />
    </View>
  );
}

/** Renames a tag on this deck's cards; a name already in use merges the two, and the sheet says so. */
function RenameSheet({
  tag,
  inUse,
  busy,
  onClose,
  onSubmit,
}: {
  tag: DeckTag | null;
  /** The learner's tags and this deck's, so a name already in use reads as a merge. */
  inUse: readonly { name: string }[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (to: string) => Promise<void>;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [opened, setOpened] = useState<DeckTag | null>(null);
  const focus = useSheetFocus({ open: tag !== null });
  // Each opening starts from the tag's name.
  if (tag !== opened) {
    setOpened(tag);
    setName(tag?.name ?? "");
    setInvalid(null);
  }
  const typed = name.trim();
  const from = tag?.name ?? "";
  const other = inUse.find(
    (used) => tagKey(used.name) === tagKey(typed) && tagKey(used.name) !== tagKey(from),
  );
  const otherName = other?.name ?? "";
  const submit = () => {
    if (busy || !tag) return;
    if (!typed) return setInvalid(t`Give the tag a name.`);
    if (typed === tag.name) return onClose();
    // Under the field, since a toast would sit under this sheet.
    void onSubmit(typed).catch((e) => setInvalid(errorMessage(e)));
  };
  return (
    <Sheet
      title={t`Rename “${{ tagName: isolate(from) }}”`}
      description={t`Only this deck’s cards change. Other decks keep the tag as it is.`}
      save={{
        label: other ? t`Merge` : t`Rename`,
        onPress: submit,
        busy,
        disabled: !typed,
      }}
      open={tag !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <View className="rounded-xl bg-glass-plate px-4">
        <TextInput
          value={name}
          onChangeText={(next) => {
            setName(next);
            setInvalid(null);
          }}
          {...focus}
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="done"
          maxLength={TAG_LIMITS.length}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t`Name`}
          selectionColor={p.text}
          className="min-h-11 py-2 font-sans text-text"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      {other && !invalid && (
        <SheetNote>
          {t`You already have “${{ otherName: isolate(otherName) }}”, so the two merge into one tag on these cards.`}
        </SheetNote>
      )}
      {invalid && <SheetError>{invalid}</SheetError>}
    </Sheet>
  );
}

/** Picks the tag of this deck that another merges into; the merge runs once the sheet has gone. */
function MergeSheet({
  tag,
  tags,
  onClose,
  onMerge,
}: {
  tag: DeckTag | null;
  tags: readonly DeckTag[];
  onClose: () => void;
  onMerge: (from: DeckTag, into: DeckTag) => void;
}) {
  const { t, i18n } = useLingui();
  const { height } = useWindowDimensions();
  const tagName = tag?.name ?? "";
  const others = tags
    .filter((other) => tagKey(other.name) !== tagKey(tagName))
    .map((other) => ({ ...other, label: other.name }));
  const { query, setQuery, searching, shown } = useSearched(others);
  const chosen = useRef<(() => void) | null>(null);
  const choose = (into: DeckTag) => {
    if (!tag) return;
    chosen.current = () => onMerge(tag, into);
    onClose();
  };
  const rows = (
    <SheetGroup>
      {shown.map((other, at) => (
        <SheetRow
          key={tagKey(other.name)}
          label={other.name}
          value={i18n.number(other.cards)}
          active={searching && at === 0}
          onPress={() => choose(other)}
        />
      ))}
    </SheetGroup>
  );
  return (
    <Sheet
      title={t`Merge “${{ tagName: isolate(tagName) }}” into`}
      description={t`Its cards take the other tag instead, here in this deck only.`}
      open={tag !== null}
      onOpenChange={(open) => !open && onClose()}
      onDismiss={() => {
        chosen.current?.();
        chosen.current = null;
        setQuery("");
      }}
    >
      {others.length > SEARCHED_PAST ? (
        <>
          <SearchField
            label={t`Tags`}
            placeholder={t`Find a tag`}
            query={query}
            onChange={setQuery}
            onSubmit={() => {
              const first = shown[0];
              if (first) choose(first);
            }}
          />
          <ScrollView
            style={{ height: height * 0.55 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {shown.length > 0 ? (
              rows
            ) : (
              <Text className="px-4 py-3 text-md text-muted">{t`No matches`}</Text>
            )}
          </ScrollView>
        </>
      ) : (
        rows
      )}
    </Sheet>
  );
}
