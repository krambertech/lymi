import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, type DeckTags, errorMessage } from "@lymi/client/api";
import { deckTagsQuery, settleDeckTags } from "@lymi/client/queries";
import { isolate, TAG_LIMITS, tagKey } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useRef, useState } from "react";
import { Alert, ScrollView, TextInput, useWindowDimensions, View } from "react-native";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { ActionMenu } from "../ui/action-menu";
import { SEARCHED_PAST, SearchField, useSearched } from "../ui/menu";
import { Button, Text } from "../ui/primitives";
import { Sheet, SheetError, SheetGroup, SheetRow } from "../ui/sheet";
import { useSheetFocus } from "../ui/sheet-focus";
import { ToastScope, toast } from "../ui/toast-host";

// A deck's tags, for its owner, as the web's Tags page: Rename only renames, Merge into… is the one
// way to combine two tags and asks first, since a merge has no Undo. Archive offers Undo.
// docs/design/library-decks-and-cards.md "Tags".

export type DeckTag = DeckTags["tags"][number];

/** Whether a tag's name holds the text being searched for, as the web's Find a tag matches. */
export const tagMatches = (tag: DeckTag, query: string) => tagKey(tag.name).includes(tagKey(query));

/**
 * The deck's tags and everything done to them: its rows, its sheets and the writes behind them,
 * so the Tags page and its search act alike. Mount `sheets` once on the screen.
 */
export function useTagManager(deckId: string) {
  const { t } = useLingui();
  const qc = useQueryClient();
  // A screen iOS presents over the root, such as the search, shows these toasts itself.
  const scope = useContext(ToastScope);
  const query = useQuery({ ...deckTagsQuery(deckId), enabled: !!deckId });
  const tags = query.data?.tags ?? [];
  const [renaming, setRenaming] = useState<DeckTag | null>(null);
  const [merging, setMerging] = useState<DeckTag | null>(null);

  const settle = (next: DeckTags) => settleDeckTags(qc, deckId, next);
  const failed = (e: unknown) => toast.add({ error: true, title: errorMessage(e), scope });
  // Not this screen's mutations: Undo can be pressed after the learner has left the screen.
  const renameBack = (from: string, to: string) =>
    void api
      .renameDeckTag(deckId, { from, to })
      .then(settle)
      .catch((e) => failed(e));
  const restoreQuietly = (tag: DeckTag) =>
    void api
      .restoreDeckTag(deckId, { name: tag.name })
      .then(settle)
      .catch((e) => failed(e));

  const rename = useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      // Decided before the write, since the list it reads changes once the rename lands.
      const merge = tags.some(
        (tag) => tagKey(tag.name) === tagKey(to) && tagKey(tag.name) !== tagKey(from),
      );
      const next = await api.renameDeckTag(deckId, { from, to });
      await settle(next);
      return { next, merge };
    },
    onSuccess: ({ next, merge }, { from, to }) => {
      const id = `rename-tag-${deckId}`;
      const spelled = next.tags.find((tag) => tagKey(tag.name) === tagKey(to))?.name ?? to;
      // A merge cannot be told apart again, so only a plain rename offers Undo.
      toast.add(
        merge
          ? {
              id,
              scope,
              title: t`Merged “${{ from: isolate(from) }}” into “${{ spelled: isolate(spelled) }}”`,
            }
          : {
              id,
              scope,
              title: t`Renamed “${{ from: isolate(from) }}” to “${{ spelled: isolate(spelled) }}”`,
              action: {
                label: t`Undo`,
                onPress: () => {
                  toast.close(id);
                  renameBack(spelled, from);
                },
              },
            },
      );
    },
  });
  const archive = useMutation({
    mutationFn: (tag: DeckTag) => api.archiveDeckTag(deckId, { name: tag.name }),
    onSuccess: async (next, tag) => {
      await settle(next);
      const tagName = tag.name;
      toast.add({
        id: `archive-tag-${deckId}-${tag.name}`,
        scope,
        title: t`Archived “${{ tagName: isolate(tagName) }}” from ${plural(tag.cards, { one: "# card", other: "# cards" })}`,
        action: { label: t`Undo`, onPress: () => restoreQuietly(tag) },
      });
    },
    onError: failed,
  });
  const restore = useMutation({
    mutationFn: (tag: DeckTag) => api.restoreDeckTag(deckId, { name: tag.name }),
    onSuccess: async (next, tag) => {
      toast.close(`archive-tag-${deckId}-${tag.name}`);
      await settle(next);
    },
    onError: failed,
  });

  // A merge cannot be undone, so it asks first, naming both tags. overlays.md.
  const confirmMerge = (from: DeckTag, into: DeckTag) => {
    const fromName = from.name;
    const intoName = into.name;
    Alert.alert(
      t`Merge “${{ fromName: isolate(fromName) }}” into “${{ intoName: isolate(intoName) }}”?`,
      t`This deck’s cards tagged “${{ fromName: isolate(fromName) }}” take “${{ intoName: isolate(intoName) }}” instead. You can’t undo a merge.`,
      [
        { text: t`Keep both`, style: "cancel" },
        {
          text: t`Merge`,
          style: "destructive",
          onPress: () =>
            void rename.mutateAsync({ from: from.name, to: into.name }).catch((e) => failed(e)),
        },
      ],
    );
  };

  const row = (tag: DeckTag, first: boolean) => (
    <TagRow
      key={tagKey(tag.name)}
      tag={tag}
      first={first}
      canMerge={tags.length > 1}
      onRename={() => setRenaming(tag)}
      onMerge={() => setMerging(tag)}
      onArchive={() => archive.mutate(tag)}
    />
  );
  const archivedRow = (tag: DeckTag, first: boolean) => (
    <ArchivedRow
      key={tagKey(tag.name)}
      tag={tag}
      first={first}
      restoring={restore.isPending && restore.variables?.name === tag.name}
      waiting={restore.isPending}
      onRestore={() => restore.mutate(tag)}
    />
  );
  const sheets = (
    <>
      <RenameSheet
        tag={renaming}
        tags={tags}
        busy={rename.isPending}
        onClose={() => setRenaming(null)}
        onFailedLate={failed}
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
        onChosen={confirmMerge}
      />
    </>
  );
  return { query, row, archivedRow, sheets };
}

/** A tag in use: its name and how many cards carry it, with its commands in its ⋯ and for VoiceOver. */
function TagRow({
  tag,
  first,
  canMerge,
  onRename,
  onMerge,
  onArchive,
}: {
  tag: DeckTag;
  first: boolean;
  canMerge: boolean;
  onRename: () => void;
  onMerge: () => void;
  onArchive: () => void;
}) {
  const { t } = useLingui();
  const name = tag.name;
  const cards = plural(tag.cards, { one: "# card", other: "# cards" });
  return (
    <View
      className={`min-h-14 flex-row items-center gap-3 py-2 ps-4 pe-3 ${first ? "" : "border-t border-edge"}`}
    >
      <View
        className="flex-1 flex-row items-center gap-3"
        accessible
        accessibilityLabel={t`${{ name: isolate(name) }}, ${cards}`}
        accessibilityActions={[
          { name: "rename", label: t`Rename…` },
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
  );
}

/** An archived tag, quieter than those in use, with Restore at its end. */
function ArchivedRow({
  tag,
  first,
  restoring,
  waiting,
  onRestore,
}: {
  tag: DeckTag;
  first: boolean;
  restoring: boolean;
  /** Another restore is under way, so this one waits rather than cross it. */
  waiting: boolean;
  onRestore: () => void;
}) {
  const { t } = useLingui();
  return (
    <View
      className={`min-h-14 flex-row items-center gap-3 py-2 ps-4 pe-3 ${first ? "" : "border-t border-edge"}`}
    >
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

/** Renames a tag on this deck's cards. A name already on them is refused, since combining is Merge into…'s. */
function RenameSheet({
  tag,
  tags,
  busy,
  onClose,
  onSubmit,
  onFailedLate,
}: {
  tag: DeckTag | null;
  /** The deck's tags in use, so a name already among them is caught before it is sent. */
  tags: readonly DeckTag[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (to: string) => Promise<void>;
  /** A rename that fails after the sheet was swiped away. */
  onFailedLate: (e: unknown) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [opened, setOpened] = useState<DeckTag | null>(null);
  const focus = useSheetFocus({ open: tag !== null });
  const open = useRef(false);
  open.current = tag !== null;
  // Each opening starts from the tag's name.
  if (tag !== opened) {
    setOpened(tag);
    setName(tag?.name ?? "");
    setInvalid(null);
  }
  const typed = name.trim();
  const from = tag?.name ?? "";
  const taken = tags.find(
    (other) => tagKey(other.name) === tagKey(typed) && tagKey(other.name) !== tagKey(from),
  );
  const takenName = taken?.name ?? "";
  const submit = () => {
    if (busy || !tag || taken) return;
    if (!typed) return setInvalid(t`Give the tag a name.`);
    if (typed === tag.name) return onClose();
    // Under the field, since a toast would sit under this sheet; once it has been swiped away, a toast.
    void onSubmit(typed).catch((e) =>
      open.current ? setInvalid(errorMessage(e)) : onFailedLate(e),
    );
  };
  return (
    <Sheet
      title={t`Rename “${{ tagName: isolate(from) }}”`}
      description={t`Only this deck’s cards change. Other decks keep the tag as it is.`}
      save={{ label: t`Rename`, onPress: submit, busy, disabled: !typed || !!taken }}
      open={tag !== null}
      onOpenChange={(next) => !next && onClose()}
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
      {taken ? (
        <SheetError>
          {t`“${{ takenName: isolate(takenName) }}” is already a tag on this deck. To combine the two, use Merge into… instead.`}
        </SheetError>
      ) : (
        invalid && <SheetError>{invalid}</SheetError>
      )}
    </Sheet>
  );
}

/** Picks the tag of this deck that another merges into; the question comes once the sheet has gone. */
function MergeSheet({
  tag,
  tags,
  onClose,
  onChosen,
}: {
  tag: DeckTag | null;
  tags: readonly DeckTag[];
  onClose: () => void;
  onChosen: (from: DeckTag, into: DeckTag) => void;
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
    chosen.current = () => onChosen(tag, into);
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
      onOpenChange={(next) => !next && onClose()}
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
