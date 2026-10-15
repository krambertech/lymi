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
import { SectionPath } from "../../../sections/section-path";
import { usePalette } from "../../../theme/palette";
import { inputCap } from "../../../theme/type";
import { EmptyState } from "../../../ui/empty-state";
import { Button, Plate, Text } from "../../../ui/primitives";
import { Row, Rows } from "../../../ui/row";
import { BarText, Screen } from "../../../ui/screen";
import { Sheet, SheetError, SheetGroup, SheetNote, SheetRow } from "../../../ui/sheet";
import { Skeleton } from "../../../ui/skeleton";
import { toast } from "../../../ui/toast-host";

/**
 * A deck's sections, for its owner, drawn as the path every learner walks. Edit in the bar shows
 * handles to drag, so the order never changes by a stray drag; at rest a row swipes open on Rename
 * and Archive. New section is the path's next stop. Archive has Undo; how sections open sits below.
 */
export default function DeckSections() {
  const { t, i18n } = useLingui();
  // A section heading's menu opens the page renaming one section, or in Edit to reorder them.
  const params = useLocalSearchParams<{ id: string; rename?: string; edit?: string }>();
  const { id } = params;
  const deck = useDecks().data?.find((d) => d.id === id);
  const query = useSections(id);
  const sections = query.data?.sections ?? [];
  const qc = useQueryClient();
  const [naming, setNaming] = useState<{ section?: Section } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [choosingOrder, setChoosingOrder] = useState(false);
  const [editing, setEditing] = useState(params.edit === "1");
  const [asked, setAsked] = useState(params.rename);
  useEffect(() => {
    const section = asked ? sections.find((s) => s.id === asked) : undefined;
    if (!section) return;
    setAsked(undefined);
    setNaming({ section });
  }, [asked, sections]);
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
  // What went wrong shows as a toast, as archiving a deck's does (#702).
  const failed = (e: unknown) => toast.add({ error: true, title: errorMessage(e) });
  const handlers = { onError: failed, onSettled: refresh };
  const create = useMutation({
    mutationFn: (name: string) => api.createSection(id, { name }),
    // Its sheet says what failed, under the field.
    onSettled: refresh,
  });
  const rename = useMutation({
    mutationFn: ({ section, name }: { section: Section; name: string }) =>
      api.renameSection(section.id, name),
    onSettled: refresh,
  });
  const sectionsKey = sectionsQuery(id).queryKey;
  // The new order lands in the cache at once, so a second Move builds on it rather than the old one.
  const reorder = useMutation({
    mutationFn: (ids: string[]) => api.reorderSections(id, ids),
    onMutate: async (ids) => {
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
      failed(e);
    },
    onSettled: refresh,
  });
  const restore = useMutation({
    mutationFn: (section: Section) => api.restoreSection(section.id),
    onSuccess: (_r, section) => toast.close(`archive-section-${section.id}`),
    onSettled: refresh,
  });
  // Archiving happens at once and offers Undo, as a deck's does; its cards stay in the deck without
  // a section, and Restore, from Undo or Archived sections, moves them back.
  const archive = useMutation({
    mutationFn: (section: Section) => api.archiveSection(section.id, { cards: "keep" }),
    onSuccess: (_r, section) => {
      const sectionName = section.name;
      toast.add({
        id: `archive-section-${section.id}`,
        title: t`Archived “${sectionName}”`,
        // Not the page's restore mutation: Undo can be pressed after the learner has left the page.
        action: {
          label: t`Undo`,
          onPress: () =>
            void api
              .restoreSection(section.id)
              .then(refresh)
              .catch((e) => failed(e)),
        },
      });
    },
    ...handlers,
  });
  const progression = useMutation({
    mutationFn: (sectionProgression: SectionProgression) =>
      writes.updateDeck(id, { sectionProgression }),
    ...handlers,
  });

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
    <Screen
      title={t`Sections`}
      back={back}
      onRefresh={() => Promise.all([query.refetch(), archived.refetch()])}
      description={t`Parts of this deck, such as one per lesson. Everyone studying it sees them in this order.`}
      actions={
        sections.length > 1 && (
          <BarText
            label={editing ? t`Done` : t`Edit`}
            strong={editing}
            onPress={() => setEditing(!editing)}
          />
        )
      }
    >
      {sections.length === 0 ? (
        <Plate>
          <EmptyState
            kind="start"
            size="inline"
            icon="section"
            title={t`No sections yet`}
            body={t`Make one per lesson, then move cards into it from the deck.`}
            action={{ label: t`New section`, onPress: () => setNaming({}) }}
          />
        </Plate>
      ) : (
        <SectionPath
          sections={sections}
          editing={editing && sections.length > 1}
          inOrder={deck?.sectionProgression !== "open"}
          onNew={() => setNaming({})}
          onRename={(section) => setNaming({ section })}
          onArchive={(section) => archive.mutate(section)}
          onReorder={(ids) => reorder.mutate(ids)}
          // One order at a time, so the server never receives two that cross.
          busy={reorder.isPending}
        />
      )}
      <Rows>
        {sections.length > 0 && (
          <Row
            icon="section"
            label={t`How sections open`}
            value={order?.label}
            stacked
            onPress={() => setChoosingOrder(true)}
          />
        )}
        {archivedCount > 0 && (
          <Row
            icon="restore"
            label={t`Archived sections`}
            value={i18n.number(archivedCount)}
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
        <SheetNote>{t`Anyone studying the deck can start a later section early.`}</SheetNote>
      </Sheet>

      <Sheet
        title={t`Archived sections`}
        description={t`Restore brings a section back in its place, with the cards archived alongside it.`}
        open={showArchived}
        onOpenChange={setShowArchived}
      >
        {/* In the sheet, since a toast would sit under it. */}
        {restore.isError && <SheetError>{errorMessage(restore.error)}</SheetError>}
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
    // Under the field, since a toast would sit under this sheet.
    void onSubmit(parsed.data).catch((e) => setInvalid(errorMessage(e)));
  };
  const renaming = !!target?.section;
  return (
    <Sheet
      title={renaming ? t`Rename section` : t`New section`}
      description={renaming ? undefined : t`It goes at the end. Move cards into it from the deck.`}
      save={{
        label: renaming ? t`Save` : t`Create section`,
        onPress: submit,
        busy,
        disabled: !name.trim(),
      }}
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
    >
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
      {invalid && <SheetError>{invalid}</SheetError>}
    </Sheet>
  );
}
