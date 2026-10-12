import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { apiUrl, type CardEvent, type CardState } from "@lymi/client/api";
import { cardHistoryQuery } from "@lymi/client/queries";
import { deserializeState } from "@lymi/core";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { type ReactNode, useState } from "react";
import { Image, View } from "react-native";
import { useSessionHeaders } from "../../../../auth/client";
import { languageName } from "../../../../data/languages";
import { useDeckCards, useDecks } from "../../../../data/queries";
import { CardNotes } from "../../../../review/card-notes";
import { modeLabel } from "../../../../review/modes";
import { usePalette } from "../../../../theme/palette";
import { SourceChip, StateChip } from "../../../../ui/chip";
import { GRADES, GradeMark } from "../../../../ui/grade";
import { Icon, type IconName } from "../../../../ui/icons";
import { Plate, Press, Text } from "../../../../ui/primitives";
import { Screen } from "../../../../ui/screen";
import { Skeleton } from "../../../../ui/skeleton";

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
 * back and every review and change. Nothing here is edited in place; editing arrives with #581.
 */
export default function CardPage() {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const { card: id, deck: deckId } = useLocalSearchParams<{ card: string; deck: string }>();
  const deck = useDecks().data?.find((d) => d.id === deckId);
  const cards = useDeckCards(deckId);
  const row = cards.data?.find((r) => r.card.id === id);
  const history = useQuery(cardHistoryQuery(id)).data;
  const [older, setOlder] = useState(false);
  const now = new Date();
  const card = row?.card;
  if (!card) {
    return (
      <Screen title="" back={{ label: deck?.name ?? t`Deck`, to: `/library/${deckId}` }}>
        {cards.data ? (
          // Archived or moved elsewhere since the list was opened.
          <Text className="px-1 text-base text-muted">{t`This card is no longer in this deck.`}</Text>
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
  const details: { label: string; value: ReactNode }[] = [
    ...(card.important
      ? [
          {
            label: t`Important`,
            value: <Icon name="important" size={16} colour={p["amber-mark"]} />,
          },
        ]
      : []),
    { label: t`Deck`, value: deck?.name ?? "" },
    ...(card.language ? [{ label: t`Language`, value: languageName(card.language) }] : []),
    ...(card.source ? [{ label: t`Source`, value: card.source }] : []),
    ...(asked ? [{ label: t`Asked`, value: asked }] : []),
    ...(card.tags.length ? [{ label: t`Tags`, value: card.tags.join(", ") }] : []),
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
        mark: <Icon name={icon} size={15} colour={p.muted} />,
        title: i18n._(text),
        // An actor a newer Worker added goes unnamed rather than raw. ADR 0032.
        line: ACTOR[e.actor] ? i18n._(ACTOR[e.actor] as MessageDescriptor) : "",
        strong: false,
      };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const shown = older ? items : items.slice(0, HISTORY_ROWS);

  // The term is the page's title, which travels into the bar as the page scrolls.
  const pronunciation = card.pronunciation && (
    <View className="-mt-4 flex-row items-center gap-2 px-1">
      <Text className="text-md text-muted">{card.pronunciation}</Text>
      {card.pronunciationSource === "ai" && <SourceChip source="ai" field="pronunciation" badge />}
    </View>
  );

  const fields = (
    <View className="gap-5">
      <Field
        label={t`Meaning`}
        ai={card.meaning ? card.meaningSource === "ai" : false}
        field="meaning"
      >
        <Text className={`text-md ${card.meaning ? "text-text" : "text-muted"}`}>
          {card.meaning || t`No meaning yet`}
        </Text>
      </Field>
      {card.example && (
        <Field label={t`Example`} ai={card.exampleSource === "ai"} field="example">
          <Text className="text-md text-text">{card.example}</Text>
        </Field>
      )}
      {card.notes && (
        <Field label={t`Notes`} ai={card.notesSource === "ai"}>
          <CardNotes source={card.notes} className="text-md text-text" />
        </Field>
      )}
      {card.hook && (
        <Field label={t`Memory hook`} ai={card.hookSource === "ai"} field="hook">
          <Text className="text-md text-text">{card.hook}</Text>
        </Field>
      )}
    </View>
  );

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
                <Text className="text-sm text-muted" style={{ fontVariant: ["tabular-nums"] }}>
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
    <View className="gap-3.5 px-5 py-4">
      {shown.map((item) => (
        <View key={item.key} className="flex-row gap-3">
          <View className="w-5 items-center pt-0.5">{item.mark}</View>
          <View className="flex-1 gap-0.5">
            <Text className={`text-md ${item.strong ? "font-medium text-text" : "text-text-2"}`}>
              {item.title}
            </Text>
            <Text className="text-sm text-muted">{item.line}</Text>
          </View>
          <Text className="text-sm text-muted">{dayLabel(item.at)}</Text>
        </View>
      ))}
      {items.length === 0 && <Text className="text-base text-muted">{t`No history yet.`}</Text>}
      {items.length > HISTORY_ROWS && !older && (
        <Press onPress={() => setOlder(true)} accessibilityRole="button" className="py-2">
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
    <Screen title={card.term} back={{ label: deck?.name ?? t`Deck`, to: `/library/${deckId}` }}>
      {pronunciation}
      <Plate className="gap-5 p-5">
        <Picture card={card} />
        {fields}
      </Plate>
      {block(
        t`Details`,
        details.map((d, i) => (
          <View
            key={d.label}
            className={`min-h-12 flex-row items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
          >
            <Text className="w-24 text-base text-muted">{d.label}</Text>
            {typeof d.value === "string" ? (
              <Text className="flex-1 text-md text-text">{d.value}</Text>
            ) : (
              <View className="flex-1">{d.value}</View>
            )}
          </View>
        )),
      )}
      {block(t`Schedule`, schedule)}
      {block(t`History`, log)}
    </Screen>
  );
}

function Field({
  label,
  ai,
  field,
  children,
}: {
  label: string;
  ai: boolean;
  field?: "meaning" | "example" | "hook";
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Text className="text-sm font-medium text-muted">{label}</Text>
        {ai && <SourceChip source="ai" field={field} badge />}
      </View>
      {children}
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
