import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, errorMessage, type Section, type Sections } from "@lymi/client/api";
import { archivedSectionsQuery, sectionsQuery } from "@lymi/client/queries";
import { focusIndex, lineColumns, opening } from "@lymi/client/section-line";
import { writes } from "@lymi/client/writes";
import type { SectionProgression } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useDeckCards, useDecks, useSections } from "../../../../../data/queries";
import { useArchiveSection } from "../../../../../sections/archive-section";
import { NameSheet } from "../../../../../sections/name-sheet";
import { OpeningLine, SectionColumns, sectionPage } from "../../../../../sections/section-line";
import { SectionPath } from "../../../../../sections/section-path";
import { useStartSection } from "../../../../../sections/sections";
import { captureEvent } from "../../../../../telemetry/posthog";
import { EmptyState } from "../../../../../ui/empty-state";
import { Button, Plate, Text } from "../../../../../ui/primitives";
import { Row, RowFace, Rows } from "../../../../../ui/row";
import { BarText, Screen } from "../../../../../ui/screen";
import { Sheet, SheetError, SheetGroup, SheetRow } from "../../../../../ui/sheet";
import { Skeleton } from "../../../../../ui/skeleton";
import { toast } from "../../../../../ui/toast-host";

/**
 * Every section of a deck with its progress, for everyone studying it: how many are known, a column
 * each, then the sections as the path a learner walks, each opening its own page. For the owner it
 * is also where sections are managed: Edit in the bar shows handles to drag, so the order never
 * changes by a stray drag; at rest a row swipes open on Rename and Archive, and New section is the
 * path's next stop. docs/proposals/section-pages.md.
 */
export default function DeckSections() {
  const { t, i18n } = useLingui();
  // A section heading's menu opens the page renaming one section, or in Edit to reorder them.
  const params = useLocalSearchParams<{ deck: string; rename?: string; edit?: string }>();
  const id = params.deck;
  const router = useRouter();
  const deck = useDecks().data?.find((d) => d.id === id);
  const owner = deck?.role === "owner";
  const query = useSections(id);
  const sections = query.data?.sections ?? [];
  const cards = useDeckCards(id);
  const columns = useMemo(() => lineColumns(sections, cards.data ?? []), [sections, cards.data]);
  const state = opening(sections, query.data?.progress ?? null);
  const focus = focusIndex(columns, state);
  const sectionStart = useStartSection(id, sections);
  const open = (sectionId: string) => {
    captureEvent("section_page_opened", { from: "sections" });
    router.push(sectionPage(id, sectionId));
  };
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
  const archived = useQuery({ ...archivedSectionsQuery(id), enabled: !!id && owner });
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
  const archive = useArchiveSection();
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
  const back = { label: deck?.name ?? t`Library`, to: `/library/${id}` as Href };
  const learned = sections.filter((s) => s.total > 0 && s.known >= s.total).length;
  const due = sections.reduce((sum, s) => sum + s.due, 0);

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
        owner &&
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
            body={
              owner ? t`Make one per lesson, then move cards into it from the deck.` : undefined
            }
            action={owner ? { label: t`New section`, onPress: () => setNaming({}) } : undefined}
          />
        </Plate>
      ) : (
        <>
          {!editing && (
            <Plate className="gap-4 p-5">
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="shrink text-base text-text-2">
                  <Trans>
                    <Text
                      className="text-4xl font-semibold text-text"
                      style={{ letterSpacing: -1, fontVariant: ["tabular-nums"] }}
                    >
                      {i18n.number(learned)}
                    </Text>{" "}
                    of {i18n.number(sections.length)} known
                  </Trans>
                </Text>
                {due > 0 && (
                  <Text className="text-base text-muted">{t`${i18n.number(due)} to review`}</Text>
                )}
              </View>
              {/* The path's sections only: the cards with no section are not a step anyone takes. */}
              <SectionColumns
                columns={columns.filter((c) => c.section)}
                focus={focus}
                onOpen={(c) => open(c.id)}
              />
              {state && (
                <OpeningLine
                  state={state}
                  due={deck?.due ?? 0}
                  starting={sectionStart.starting}
                  onStart={sectionStart.start}
                />
              )}
            </Plate>
          )}
          <SectionPath
            columns={columns}
            focus={focus}
            owner={owner}
            editing={editing && sections.length > 1}
            inOrder={deck?.sectionProgression !== "open"}
            onOpen={open}
            onNew={() => setNaming({})}
            onRename={(section) => setNaming({ section })}
            onArchive={archive.archive}
            onReorder={(ids) => reorder.mutate(ids)}
            // One order at a time, so the server never receives two that cross.
            busy={reorder.isPending}
          />
        </>
      )}
      <Rows>
        {sections.length > 0 &&
          (owner ? (
            <Row
              icon="section"
              label={t`How sections open`}
              value={order?.label}
              stacked
              onPress={() => setChoosingOrder(true)}
            />
          ) : (
            <View accessible accessibilityLabel={`${t`How sections open`}, ${order?.label ?? ""}`}>
              <RowFace
                icon="section"
                label={t`How sections open`}
                value={order?.label}
                stacked
                end="none"
              />
            </View>
          ))}
        {owner && archivedCount > 0 && (
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

      {archive.sheet}

      <Sheet
        title={t`How sections open`}
        description={t`Anyone can still start a later section early.`}
        open={choosingOrder}
        onOpenChange={setChoosingOrder}
      >
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
      </Sheet>

      <Sheet
        title={t`Archived sections`}
        description={t`Restored sections return with their archived cards.`}
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
