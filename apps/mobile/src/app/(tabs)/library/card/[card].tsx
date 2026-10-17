import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { apiUrl, type CardEvent, type CardState } from "@lymi/client/api";
import { cardHistoryQuery } from "@lymi/client/queries";
import { writes } from "@lymi/client/writes";
import { deserializeState, stripReadings } from "@lymi/core";
import { ARRIVE } from "@lymi/design";
import { useQuery } from "@tanstack/react-query";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Image, View } from "react-native";
import Animated, { FadeOut, LinearTransition, ZoomIn } from "react-native-reanimated";
import { useSessionHeaders } from "../../../../auth/client";
import type { FormField } from "../../../../capture/form";
import { useArchiveCard } from "../../../../card/card-menu";
import { languageName } from "../../../../data/languages";
import { useDeckCards, useDecks } from "../../../../data/queries";
import { useMoveToSection } from "../../../../deck/move-to-section";
import { CardNotes } from "../../../../review/card-notes";
import { modeLabel } from "../../../../review/modes";
import { usePronunciation } from "../../../../review/pronounce";
import { ALWAYS, CROSSFADE, springIn, useReduceMotion } from "../../../../theme/motion";
import { usePalette } from "../../../../theme/palette";
import { TEXT_END } from "../../../../theme/type";
import { ActionMenu } from "../../../../ui/action-menu";
import { SourceChip, StateChip } from "../../../../ui/chip";
import { EmptyState } from "../../../../ui/empty-state";
import { GRADES, GradeMark } from "../../../../ui/grade";
import { Icon, type IconName } from "../../../../ui/icons";
import { LoadFailed, useLoadFailed } from "../../../../ui/load-failed";
import { Plate, Press, Text } from "../../../../ui/primitives";
import { useAccessibilitySizes } from "../../../../ui/row";
import { BarButton, Screen } from "../../../../ui/screen";
import { Skeleton } from "../../../../ui/skeleton";
import { toast } from "../../../../ui/toast-host";

const DAY = 86_400_000;
const HISTORY_ROWS = 8;

const ACTOR: Record<string, MessageDescriptor> = {
  user: msg`by you`,
  api: msg`by the API`,
  mcp: msg`by a connected app`,
  ai: msg`by the AI`,
  system: msg`by Lymi`,
};

/** A history line for a write, in a few words; the web's card page names the fields too. */
function eventLine(e: CardEvent): { icon: IconName; text: MessageDescriptor } {
  const payload = e.payload && typeof e.payload === "object" ? e.payload : {};
  if (e.action === "create") return { icon: "plus", text: msg`Card added` };
  if (e.action === "archive") return { icon: "archive", text: msg`Archived` };
  if (e.action === "restore") return { icon: "undo", text: msg`Restored` };
  if (e.action === "mark_important") return { icon: "important", text: msg`Marked important` };
  if (e.action === "unmark_important")
    return { icon: "important", text: msg`Important mark removed` };
  if (e.action.includes("image")) return { icon: "picture", text: msg`Picture changed` };
  if (e.action === "enrich" || e.actor === "ai") return { icon: "ai", text: msg`Enriched` };
  if ("deckId" in payload) return { icon: "move", text: msg`Moved to another deck` };
  return { icon: "edit", text: msg`Edited` };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * A card, to read: the word and where it stands, its picture, its fields, then when each mode is
 * back and every review and change. A tap on a field edits it in a sheet; ⋯ edits the term and
 * archives or restores the card.
 */

export default function CardPage() {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const reduce = useReduceMotion();
  const stackDetails = useAccessibilitySizes();
  const router = useRouter();
  const { card: id, deck: deckId } = useLocalSearchParams<{ card: string; deck: string }>();
  const deck = useDecks().data?.find((d) => d.id === deckId);
  const cards = useDeckCards(deckId);
  const listed = cards.data?.find((r) => r.card.id === id);
  const row = listed;
  const historyQuery = useQuery(cardHistoryQuery(id));
  const history = historyQuery.data;
  const [older, setOlder] = useState(false);
  const now = new Date();
  const card = row?.card;
  // Only the deck's owner changes its cards; a member reads them. #581.
  const owner = deck?.role === "owner";
  const editable = owner;
  // Every edit opens the whole card in one sheet, at the field tapped.
  const openCard = (field: FormField) =>
    router.push({ pathname: "/edit-card", params: { card: id, deck: deckId, field } });
  const edit = (field: FormField) => (editable ? () => openCard(field) : undefined);
  // Asked and Tags open the form on that choice's sheet.
  const choose = (choice: "modes" | "tags") =>
    editable
      ? () => router.push({ pathname: "/edit-card", params: { card: id, deck: deckId, choice } })
      : undefined;
  const pronounce = usePronunciation(card ?? null);
  const moveToSection = useMoveToSection(deckId);
  const archiveCard = useArchiveCard();
  // Back to the deck first, so a slow write never pops a screen the learner has moved to.
  const archive = (c: { id: string; term: string }) => {
    router.back();
    void archiveCard(c);
  };
  // Play sits in the menu, with no button on the page to show why it failed, so a toast says.
  const playError = pronounce?.error;
  useEffect(() => {
    if (playError) toast.add({ error: true, title: playError });
  }, [playError]);
  const failed = useLoadFailed(cards);
  const historyFailed = useLoadFailed(historyQuery);
  if (!card || !row) {
    return (
      <Screen title="" back={{ label: deck?.name ?? t`Deck`, to: `/library/${deckId}` }}>
        {cards.data ? (
          // Archived or moved elsewhere since the list was opened.
          <EmptyState
            kind="noMatch"
            title={t`This card isn’t in this deck`}
            body={t`It was archived or moved since you opened the deck.`}
            action={{
              label: t`Back to the deck`,
              onPress: () => router.dismissTo(`/library/${deckId}` as Href),
            }}
          />
        ) : failed ? (
          <LoadFailed
            query={cards}
            failed={t`Couldn’t load this card`}
            offline={t`This card needs a connection`}
          />
        ) : (
          <Skeleton height={120} />
        )}
      </Screen>
    );
  }
  const states: CardState[] = history?.states?.length
    ? history.states
    : row.state
      ? [row.state]
      : [];
  const asked = states.map((st) => i18n._(modeLabel(st.mode))).join(", ");
  // Facts about the card, each named, so nothing has to be guessed from a line of dots.
  const details: { label: string; value: ReactNode; onPress?: (() => void) | undefined }[] = [
    { label: t`Deck`, value: deck?.name ?? "" },
    ...(card.language ? [{ label: t`Language`, value: languageName(card.language) }] : []),
    ...(card.source ? [{ label: t`Source`, value: card.source }] : []),
    ...(asked ? [{ label: t`Asked`, value: asked, onPress: choose("modes") }] : []),
    ...(card.tags.length
      ? [{ label: t`Tags`, value: card.tags.join(", "), onPress: choose("tags") }]
      : []),
  ];

  const when = (due: Date) => {
    if (due <= now) return t`Due now`;
    const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
    if (days === 0) return t`Later today`;
    if (days === 1) return t`Tomorrow`;
    return days < 30
      ? plural(days, { one: "In # day", other: "In # days" })
      : plural(Math.round(days / 30), { one: "In # month", other: "In # months" });
  };
  const dayLabel = (d: Date) => {
    const ago = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
    if (ago === 0) return t`Today`;
    if (ago === 1) return t`Yesterday`;
    return i18n.date(d, { day: "numeric", month: "short" });
  };
  const items = [
    ...(history?.reviews ?? []).map((r) => ({
      key: `r-${r.id}`,
      at: new Date(r.reviewedAt),
      mark: <GradeMark rating={r.rating} />,
      title: i18n._(GRADES.find((g) => g.rating === r.rating)?.label ?? msg`Reviewed`),
      line: i18n._(modeLabel(r.mode)),
      strong: true,
    })),
    ...(history?.events ?? []).map((e) => {
      const { icon, text } = eventLine(e);
      return {
        key: `e-${e.id}`,
        at: new Date(e.at),
        mark: <Icon name={icon} size={15} colour={p["text-2"]} />,
        title: i18n._(text),
        // An actor a newer Worker added goes unnamed rather than raw. ADR 0032.
        line: ACTOR[e.actor] ? i18n._(ACTOR[e.actor] as MessageDescriptor) : "",
        strong: false,
      };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = older ? items : items.slice(0, HISTORY_ROWS);

  // The card's fields and its details read the same way: a name over its value, a hairline between.
  const fields = [
    card.pronunciation && (
      <Field
        key="pronunciation"
        label={t`Pronunciation`}
        ai={card.pronunciationSource === "ai"}
        onPress={edit("pronunciation")}
      >
        <Text className="text-md text-text">{card.pronunciation}</Text>
      </Field>
    ),
    <Field
      key="meaning"
      label={t`Meaning`}
      ai={card.meaning ? card.meaningSource === "ai" : false}
      field="meaning"
      onPress={edit("meaning")}
    >
      <Text className={`text-md ${card.meaning ? "text-text" : "text-muted"}`}>
        {card.meaning || t`No meaning yet`}
      </Text>
    </Field>,
    card.example && (
      <Field
        key="example"
        label={t`Example`}
        ai={card.exampleSource === "ai"}
        field="example"
        onPress={edit("example")}
      >
        <Text className="text-md text-text">{stripReadings(card.example)}</Text>
      </Field>
    ),
    card.notes && (
      <Field key="notes" label={t`Notes`} ai={card.notesSource === "ai"} onPress={edit("notes")}>
        <CardNotes source={card.notes} className="text-md text-text" />
      </Field>
    ),
    card.hook && (
      <Field
        key="hook"
        label={t`Memory hook`}
        ai={card.hookSource === "ai"}
        field="hook"
        onPress={edit("hook")}
      >
        <Text className="text-md text-text">{card.hook}</Text>
      </Field>
    ),
  ].filter(Boolean);

  const schedule =
    states.filter((s) => s.state !== 0).length === 0 ? (
      <Text className="px-5 py-4 text-base text-text-2">
        {t`Not reviewed yet. It comes up in your next review.`}
      </Text>
    ) : (
      <View>
        {states.map((st, i) => {
          let reps = 0;
          let lapses = 0;
          try {
            const f = deserializeState(st.fsrs);
            reps = f.reps;
            lapses = f.lapses;
          } catch {}
          return (
            <View
              key={st.id}
              className={`flex-row items-start gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-edge" : ""}`}
            >
              <View className="flex-1 gap-1.5">
                <Text className="text-md font-medium text-text">{i18n._(modeLabel(st.mode))}</Text>
                <StateChip state={st.state} size="sm" />
              </View>
              <View className="items-end gap-0.5">
                <Text className="text-md text-text">
                  {st.state === 0 ? t`Not started` : when(new Date(st.due))}
                </Text>
                <Text className="text-sm text-muted">
                  {plural(reps, { one: "# review", other: "# reviews" })}
                  {lapses > 0
                    ? ` · ${plural(lapses, { one: "forgotten once", other: "forgotten # times" })}`
                    : ""}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );

  const log = (
    <View>
      {shown.map((item, i) => (
        <View
          key={item.key}
          className={`flex-row gap-3 px-5 py-3.5 ${i > 0 ? "border-t border-edge" : ""}`}
        >
          <View className="w-5 items-center pt-0.5">{item.mark}</View>
          <View className="flex-1 gap-0.5">
            <Text className={`text-md text-text ${item.strong ? "font-medium" : ""}`}>
              {item.title}
            </Text>
            <Text className="text-sm text-muted">{item.line}</Text>
          </View>
          <Text className="text-sm text-muted">{dayLabel(item.at)}</Text>
        </View>
      ))}
      {/* The history is read on its own, so offline it can be missing for a card that has one. */}
      {historyFailed ? (
        <LoadFailed
          query={historyQuery}
          size="inline"
          failed={t`Couldn’t load this card’s history`}
          offline={t`This card’s history needs a connection`}
        />
      ) : (
        !history && (
          <View className="px-5 py-4">
            <Skeleton height={48} />
          </View>
        )
      )}
      {history && items.length === 0 && (
        <EmptyState kind="start" size="inline" icon="activity" title={t`No history yet`} />
      )}
      {items.length > HISTORY_ROWS && !older && (
        <Press
          onPress={() => setOlder(true)}
          accessibilityRole="button"
          className="border-t border-edge px-5 py-3"
        >
          <Text className="text-base font-medium text-text-2">
            {plural(items.length - HISTORY_ROWS, {
              one: "Show # older entry",
              other: "Show # older entries",
            })}
          </Text>
        </Press>
      )}
    </View>
  );

  const block = (title: string, body: ReactNode) => (
    <View>
      <Text className="px-1 pb-2.5 text-lg font-medium text-text" accessibilityRole="header">
        {title}
      </Text>
      <Plate className="overflow-hidden">{body}</Plate>
    </View>
  );

  return (
    <Screen
      title={card.term}
      back={{ label: deck?.name ?? t`Deck`, to: `/library/${deckId}` }}
      actions={
        <View className="flex-row items-center gap-2.5">
          {/* A set star stands beside ⋯ and unmarks with a tap; unset, it is only in the menu. */}
          {card.important && (
            <Animated.View
              entering={reduce ? CROSSFADE : springIn(new ZoomIn(), ARRIVE)}
              exiting={FadeOut.duration(150).reduceMotion(ALWAYS)}
            >
              <BarButton
                icon="important"
                label={t`Unmark important`}
                fill={p["amber-mark"]}
                onPress={() => void writes.setImportant(card, false)}
              />
            </Animated.View>
          )}
          <Animated.View layout={reduce ? undefined : LinearTransition.duration(220)}>
            <ActionMenu
              label={t`Card options`}
              symbol="ellipsis"
              items={[
                [
                  ...(pronounce
                    ? [
                        {
                          label: t`Play pronunciation`,
                          icon: "pronunciation" as const,
                          onSelect: pronounce.play,
                        },
                      ]
                    : []),
                  ...(editable
                    ? [
                        {
                          label: t`Edit card`,
                          icon: "edit" as const,
                          onSelect: () => openCard("term"),
                        },
                      ]
                    : []),
                  {
                    label: card.important ? t`Unmark important` : t`Mark important`,
                    icon: "important" as const,
                    onSelect: () => void writes.setImportant(card, !card.important),
                  },
                  ...(owner && moveToSection.canMove
                    ? [
                        {
                          label: t`Move to section…`,
                          icon: "move" as const,
                          onSelect: () => moveToSection.open([card.id]),
                        },
                      ]
                    : []),
                ],
                // Archive sits apart, so it is never pressed for its neighbour.
                ...(owner
                  ? [
                      [
                        {
                          label: t`Archive card`,
                          icon: "archive" as const,
                          destructive: true,
                          onSelect: () => archive(card),
                        },
                      ],
                    ]
                  : []),
              ]}
            />
          </Animated.View>
          {owner && moveToSection.sheet}
        </View>
      }
    >
      <Plate className="overflow-hidden">
        {card.image && (
          <View className="p-5 pb-1">
            <Picture card={card} />
          </View>
        )}
        {fields.map((f, i) => (
          <View key={(f as { key: string }).key} className={i > 0 ? "border-t border-edge" : ""}>
            {f}
          </View>
        ))}
      </Plate>
      {block(
        t`Details`,
        // Facts about the card, not part of it: the label and its value on one line, as Settings lays them.
        details.map((d, i) => {
          const row = `min-h-[48px] px-5 py-3 ${stackDetails ? "gap-1" : "flex-row items-center gap-4"} ${i > 0 ? "border-t border-edge" : ""}`;
          const body = (
            <>
              <Text className="text-md text-text-2">{d.label}</Text>
              <View className={stackDetails ? "items-start" : "flex-1 items-end"}>
                {typeof d.value === "string" ? (
                  <Text
                    className="text-md text-text"
                    numberOfLines={2}
                    style={stackDetails ? undefined : TEXT_END}
                  >
                    {d.value}
                  </Text>
                ) : (
                  d.value
                )}
              </View>
            </>
          );
          // A detail the learner can change opens Edit card on it, as a tap on a field does.
          return d.onPress ? (
            <Press
              key={d.label}
              onPress={d.onPress}
              accessibilityRole="button"
              accessibilityHint={t`Edit`}
              className={row}
            >
              {body}
            </Press>
          ) : (
            <View key={d.label} className={row}>
              {body}
            </View>
          );
        }),
      )}
      {block(t`Schedule`, schedule)}
      {block(t`History`, log)}
    </Screen>
  );
}

function Field({
  label,
  ai = false,
  field,
  end,
  onPress,
  children,
}: {
  label: string;
  ai?: boolean;
  field?: "meaning" | "example" | "pronunciation" | "hook";
  /** A control at the row's end, such as the pronunciation's play. */
  end?: ReactNode;
  /** Opens the field to edit; left out where the learner may not change it. */
  onPress?: (() => void) | undefined;
  children: ReactNode;
}) {
  const { t } = useLingui();
  const body = (
    <View className="flex-1 gap-1">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-medium text-muted">{label}</Text>
        {ai && <SourceChip source="ai" field={field} badge />}
      </View>
      {children}
    </View>
  );
  return (
    <View className="min-h-14 flex-row items-center gap-3 px-5 py-3.5">
      {onPress ? (
        <Press
          onPress={onPress}
          accessibilityRole="button"
          accessibilityHint={t`Edit`}
          className="flex-1 flex-row"
        >
          {body}
        </Press>
      ) : (
        body
      )}
      {end}
    </View>
  );
}

/** The card's picture with its description under it, at the picture's width. */
function Picture({
  card,
}: {
  card: NonNullable<ReturnType<typeof useDeckCards>["data"]>[number]["card"];
}) {
  const headers = useSessionHeaders();
  const image = card.image;
  if (!image || !headers) return null;
  return (
    <View className="gap-2 self-start">
      <Image
        source={{ uri: apiUrl(image.url), headers }}
        accessibilityLabel={image.description ?? undefined}
        resizeMode="contain"
        className="rounded-lg bg-plate-2"
        style={{ height: 140, aspectRatio: image.width / Math.max(1, image.height) }}
      />
      {image.description && (
        <Text
          className="text-sm text-muted"
          style={{ maxWidth: (140 * image.width) / Math.max(1, image.height) }}
        >
          {image.description}
        </Text>
      )}
    </View>
  );
}
