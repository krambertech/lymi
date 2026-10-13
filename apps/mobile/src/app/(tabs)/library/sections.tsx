import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section, type Sections } from "@lymi/client/api";
import { archivedSectionsQuery, sectionsQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { SectionInput, type SectionProgression, sectionLimits } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { useDecks, useSections } from "../../../data/queries";
import { usePalette } from "../../../theme/palette";
import { inputCap } from "../../../theme/type";
import { EmptyState } from "../../../ui/empty-state";
import { Icon } from "../../../ui/icons";
import { DropdownMenu } from "../../../ui/menu";
import { Button, IconButton, Plate, Text } from "../../../ui/primitives";
import { Row, Rows } from "../../../ui/row";
import { Screen } from "../../../ui/screen";
import { Sheet, SheetGroup, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";

/**
 * A deck's sections, for its owner, as the web's deck settings arrange them: in order, moved with
 * Move up and Move down rather than dragged, since the order is what every learner opens them in.
 * New, rename, archive with a choice for its cards, restore, and how sections open.
 */
export default function DeckSections() {
  const { t } = useLingui();
  const { id } = useLocalSearchParams<{ id: string }>();
  const deck = useDecks().data?.find((d) => d.id === id);
  const query = useSections(id);
  const sections = query.data?.sections ?? [];
  const qc = useQueryClient();
  const p = usePalette();
  const [naming, setNaming] = useState<{ section?: Section } | null>(null);
  const [archiving, setArchiving] = useState<Section | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [choosingOrder, setChoosingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = useQuery({ ...archivedSectionsQuery(id), enabled: !!id });
  const archivedCount = archived.data?.sections.length ?? 0;
  // Restoring the last archived section leaves nothing to show, so its sheet goes too.
  useEffect(() => {
    if (archived.data && archivedCount === 0) setShowArchived(false);
  }, [archived.data, archivedCount]);

  const refresh = () =>
    Promise.all(
      ["decks", "series", "queue", "rounds"].map((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const handlers = {
    onMutate: () => setError(null),
    onError: (e: unknown) => setError(errorMessage(e)),
    onSettled: refresh,
  };
  const create = useMutation({
    mutationFn: (name: string) => api.createSection(id, { name }),
    ...handlers,
  });
  const rename = useMutation({
    mutationFn: ({ section, name }: { section: Section; name: string }) =>
      api.renameSection(section.id, name),
    ...handlers,
  });
  const sectionsKey = sectionsQuery(id).queryKey;
  // The new order lands in the cache at once, so a second Move builds on it rather than the old one.
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.reorderSections(id, ids),
    onMutate: async (ids) => {
      setError(null);
      await qc.cancelQueries({ queryKey: sectionsKey, exact: true });
      const before = qc.getQueryData<Sections>(sectionsKey);
      if (before) {
        const byId = new Map(before.sections.map((s) => [s.id, s]));
        qc.setQueryData<Sections>(sectionsKey, {
          ...before,
          sections: ids.flatMap((sid) => byId.get(sid) ?? []),
        });
      }
      return () => qc.setQueryData(sectionsKey, before);
    },
    onError: (e, _ids, undo) => {
      undo?.();
      setError(errorMessage(e));
    },
    onSettled: refresh,
  });
  const archive = useMutation({
    mutationFn: ({ section, cards }: { section: Section; cards: "archive" | "keep" }) =>
      api.archiveSection(section.id, { cards }),
    ...handlers,
  });
  const restore = useMutation({
    mutationFn: (section: Section) => api.restoreSection(section.id),
    ...handlers,
  });
  const progression = useMutation({
    mutationFn: (sectionProgression: SectionProgression) =>
      writes.updateDeck(id, { sectionProgression }),
    ...handlers,
  });

  const move = (section: Section, by: -1 | 1) => {
    // One reorder at a time, so the server never receives two orders that cross.
    if (reorder.isPending) return;
    const ids = sections.map((s) => s.id);
    const at = ids.indexOf(section.id);
    const to = at + by;
    if (to < 0 || to >= ids.length) return;
    [ids[at], ids[to]] = [ids[to] as string, ids[at] as string];
    reorder.mutate(ids);
  };
  const askArchive = (section: Section) =>
    section.total > 0 ? setArchiving(section) : archive.mutate({ section, cards: "keep" });

  const orders: { value: SectionProgression; label: string; short: string; line: string }[] = [
    {
      value: "automatic",
      short: t`Automatically`,
      label: t`One after another, automatically`,
      line: t`Each section opens once you know most of the one before it.`,
    },
    {
      value: "manual",
      short: t`When started`,
      label: t`One after another, when you start them`,
      line: t`When most of a section is known, the next one is ready and you choose when to start it.`,
    },
    {
      value: "open",
      short: t`All at once`,
      label: t`All at once`,
      line: t`Every section is open, so any card can come up in review.`,
    },
  ];
  const order = orders.find((o) => o.value === deck?.sectionProgression);
  const back = {
    label: deck?.name ?? t`Deck settings`,
    to: `/library/deck-settings?id=${id}` as Href,
  };

  if (!query.data) {
    return (
      <Screen title={t`Sections`} back={back}>
        <Skeleton height={160} />
      </Screen>
    );
  }

  return (
    <Screen title={t`Sections`} back={back}>
      <Text className="px-1 text-base text-text-2">
        {t`Parts of this deck, such as one per lesson. Everyone studying it sees them in this order.`}
      </Text>
      {error && (
        <View className="flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
          <Icon name="alert" size={14} colour={p.danger} />
          <Text className="flex-1 text-base text-danger">{error}</Text>
        </View>
      )}
      {sections.length === 0 ? (
        <Plate>
          <EmptyState
            kind="start"
            size="inline"
            icon="section"
            title={t`No sections yet`}
            body={t`Make one per lesson, then move cards into it from the deck.`}
          />
        </Plate>
      ) : (
        <Plate className="overflow-hidden">
          {sections.map((section, at) => {
            const sectionName = section.name;
            return (
              <View
                key={section.id}
                className={`min-h-14 flex-row items-center gap-3 py-2 pe-1.5 ps-4 ${at > 0 ? "border-t border-edge" : ""}`}
              >
                <Text className="w-5 text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  {at + 1}
                </Text>
                <View className="flex-1">
                  <Text className="text-md font-medium text-text" numberOfLines={2}>
                    {sectionName}
                  </Text>
                  <Text className="text-sm text-muted">
                    {plural(section.total, { one: "# card", other: "# cards" })}
                  </Text>
                </View>
                <DropdownMenu
                  title={sectionName}
                  items={[
                    [
                      {
                        label: t`Rename`,
                        icon: "edit",
                        onSelect: () => setNaming({ section }),
                      },
                      ...(at > 0 && !reorder.isPending
                        ? [
                            {
                              label: t`Move up`,
                              icon: "moveUp" as const,
                              onSelect: () => move(section, -1),
                            },
                          ]
                        : []),
                      ...(at < sections.length - 1 && !reorder.isPending
                        ? [
                            {
                              label: t`Move down`,
                              icon: "moveDown" as const,
                              onSelect: () => move(section, 1),
                            },
                          ]
                        : []),
                    ],
                    [
                      {
                        label: t`Archive`,
                        icon: "archive",
                        destructive: true,
                        onSelect: () => askArchive(section),
                      },
                    ],
                  ]}
                  trigger={(open) => (
                    <IconButton
                      icon="more"
                      size="sm"
                      label={t`Options for ${sectionName}`}
                      onPress={open}
                    />
                  )}
                />
              </View>
            );
          })}
        </Plate>
      )}
      <Button label={t`New section`} icon="plus" onPress={() => setNaming({})} />
      <Rows>
        {sections.length > 0 && (
          <Row
            icon="section"
            label={t`How sections open`}
            value={order?.short}
            onPress={() => setChoosingOrder(true)}
          />
        )}
        {archivedCount > 0 && (
          <Row
            icon="restore"
            label={t`Archived sections`}
            value={String(archivedCount)}
            onPress={() => setShowArchived(true)}
          />
        )}
      </Rows>

      <NameSheet
        target={naming}
        onClose={() => setNaming(null)}
        busy={create.isPending || rename.isPending}
        onSubmit={async (name) => {
          if (naming?.section) await rename.mutateAsync({ section: naming.section, name });
          else await create.mutateAsync(name);
          setNaming(null);
        }}
      />

      <Sheet
        title={archiving ? t`Archive “${archiving.name}”?` : undefined}
        open={archiving !== null}
        onOpenChange={(open) => !open && setArchiving(null)}
      >
        <Text className="px-1 text-base text-text-2">
          {t`Nothing is deleted. Restore it from Archived sections.`}
        </Text>
        {archiving && (
          <SheetGroup>
            <SheetRow
              label={plural(archiving.total, { one: "Keep the card", other: "Keep the cards" })}
              detail={plural(archiving.total, {
                one: "It stays in the deck without a section, and keeps coming up in review.",
                other: "They stay in the deck without a section, and keep coming up in review.",
              })}
              onPress={() => {
                archive.mutate({ section: archiving, cards: "keep" });
                setArchiving(null);
              }}
            />
            <SheetRow
              label={plural(archiving.total, {
                one: "Archive its card too",
                other: "Archive its # cards too",
              })}
              detail={plural(archiving.total, {
                one: "It leaves the deck and stops coming up in review until you restore the section.",
                other:
                  "They leave the deck and stop coming up in review until you restore the section.",
              })}
              destructive
              onPress={() => {
                archive.mutate({ section: archiving, cards: "archive" });
                setArchiving(null);
              }}
            />
          </SheetGroup>
        )}
      </Sheet>

      <Sheet title={t`How sections open`} open={choosingOrder} onOpenChange={setChoosingOrder}>
        <SheetGroup>
          {orders.map((o) => (
            <SheetRow
              key={o.value}
              label={o.label}
              detail={o.line}
              chosen={o.value === deck?.sectionProgression}
              onPress={() => {
                setChoosingOrder(false);
                if (o.value !== deck?.sectionProgression) progression.mutate(o.value);
              }}
            />
          ))}
        </SheetGroup>
        <Text className="px-1 text-sm text-muted">
          {t`Anyone studying the deck can start a later section early.`}
        </Text>
      </Sheet>

      <Sheet title={t`Archived sections`} open={showArchived} onOpenChange={setShowArchived}>
        <Text className="px-1 text-base text-text-2">
          {t`Restore brings a section back in its place, with the cards archived alongside it.`}
        </Text>
        <View className="overflow-hidden rounded-xl bg-glass-plate">
          {(archived.data?.sections ?? []).map((s, at) => (
            <View
              key={s.id}
              className={`min-h-14 flex-row items-center gap-3 px-4 py-2 ${at > 0 ? "border-t border-edge" : ""}`}
            >
              <View className="flex-1">
                <Text className="text-md font-medium text-text">{s.name}</Text>
                <Text className="text-sm text-muted">
                  {s.archivedCards > 0
                    ? plural(s.archivedCards, {
                        one: "# card comes back with it",
                        other: "# cards come back with it",
                      })
                    : t`The cards you kept move back into it`}
                </Text>
              </View>
              <Button
                label={t`Restore`}
                size="sm"
                loading={restore.isPending && restore.variables?.id === s.id}
                disabled={restore.isPending}
                onPress={() => restore.mutate(s)}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

/** A section is a name, so making or renaming one is one field. */
function NameSheet({
  target,
  onClose,
  onSubmit,
  busy,
}: {
  target: { section?: Section } | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  busy: boolean;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [opened, setOpened] = useState<typeof target>(null);
  // Each opening starts from the section's name, or empty for a new one.
  if (target !== opened) {
    setOpened(target);
    setName(target?.section?.name ?? "");
    setInvalid(null);
  }
  const submit = () => {
    if (busy) return;
    const parsed = SectionInput.shape.name.safeParse(name);
    if (!parsed.success) {
      setInvalid(t`Give the section a name.`);
      return;
    }
    void onSubmit(parsed.data).catch(() => {});
  };
  const renaming = !!target?.section;
  return (
    <Sheet
      title={renaming ? t`Rename section` : t`New section`}
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      {!renaming && (
        <Text className="px-1 text-base text-text-2">
          {t`It goes at the end. Move cards into it from the deck.`}
        </Text>
      )}
      <View className="rounded-xl bg-glass-plate px-4">
        <TextInput
          value={name}
          onChangeText={(next) => {
            setName(next);
            setInvalid(null);
          }}
          autoFocus
          onSubmitEditing={submit}
          submitBehavior="submit"
          returnKeyType="done"
          maxLength={sectionLimits.name ?? undefined}
          placeholder={t`Lesson 15`}
          placeholderTextColor={p.muted}
          accessibilityLabel={t`Name`}
          selectionColor={p.text}
          className="min-h-11 py-2 font-sans text-text"
          style={{ fontSize: 17 }}
          maxFontSizeMultiplier={inputCap(17)}
        />
      </View>
      {invalid && <Text className="px-1 text-base text-danger">{invalid}</Text>}
      <Button
        label={renaming ? t`Save` : t`Create section`}
        variant="primary"
        size="lg"
        loading={busy}
        onPress={submit}
      />
    </Sheet>
  );
}
