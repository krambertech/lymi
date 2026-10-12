import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS, type StreakOut } from "@lymi/core";
import * as Haptics from "expo-haptics";
import { type Href, useIsFocused, useRouter } from "expo-router";
import { useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Flame } from "../../../brand/flame";
import { Lantern } from "../../../brand/lantern";
import { REST_DISMISSED_KEY, todayStore } from "../../../data/kept";
import { useDay, useDecks, useRounds, useStreak } from "../../../data/queries";
import { clear, usePalette, useRoom } from "../../../theme/palette";
import {
  Button,
  Icon,
  IconButton,
  Plate,
  Press,
  RowArrow,
  SectionTitle,
  Text,
} from "../../../ui/primitives";
import { RestGlyph } from "../../../ui/rest-glyph";
import { Screen } from "../../../ui/screen";
import { SevenLights } from "../../../ui/seven-lights";
import { Skeleton } from "../../../ui/skeleton";

/**
 * Today, as the web's: the lit room with what is due, the streak, the rounds that can be reviewed
 * on their own, then the decks with something due. Nothing here shows a term, so the page never
 * gives an answer away before the review asks for it.
 */
export default function Today() {
  const { t } = useLingui();
  const decks = useDecks();
  const streak = useStreak();
  const rounds = useRounds();
  const day = useDay();
  const rest = useRestDismissal(day.summary?.today.date);
  const total = decks.data?.reduce((n, d) => n + d.total, 0) ?? 0;
  const failed = (decks.isError && !decks.data) || (streak.isError && !streak.data);
  const loading = (!decks.data || !streak.data) && !failed;
  const nothingYet = !loading && total === 0;

  if (failed) {
    return (
      <Screen title={t`Today`} kind="tab">
        <LoadFailed
          retrying={decks.isFetching || streak.isFetching}
          onRetry={() => {
            void decks.refetch();
            void streak.refetch();
          }}
        />
      </Screen>
    );
  }
  return (
    <Screen title={t`Today`} kind="tab">
      {/* The banner sits at the cards' own gap, because it is about the streak below it. */}
      <View className="gap-3">
        {!loading && day.restedYesterday && !rest.dismissed && (
          <RestDayBanner current={day.streak} onDismiss={rest.dismiss} />
        )}
        {loading ? (
          <View className="items-center gap-5 pt-4">
            <Skeleton width={150} height={150} />
            <Skeleton width={120} height={40} />
            <Skeleton height={64} />
          </View>
        ) : (
          <LitDue decks={decks.data ?? []} nothingYet={nothingYet} />
        )}
        {loading ? (
          <Skeleton height={150} />
        ) : (
          !nothingYet && day.summary && <StreakPlate summary={day.summary} />
        )}
      </View>
      {!loading && !nothingYet && rounds.data && <Rounds rounds={rounds.data} />}
      {!loading && decks.data && decks.data.length > 1 && <DecksToReview decks={decks.data} />}
    </Screen>
  );
}

function startReview(router: ReturnType<typeof useRouter>, href: Href = "/review") {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  router.push(href);
}

/** The day the banner was closed on, kept so it stays away until that day ends. */
function useRestDismissal(today: string | undefined) {
  const [closed, setClosed] = useState(() => todayStore.getString(REST_DISMISSED_KEY));
  return {
    dismissed: !!today && closed === today,
    dismiss: () => {
      if (!today) return;
      todayStore.set(REST_DISMISSED_KEY, today);
      setClosed(today);
    },
  };
}

type Deck = NonNullable<ReturnType<typeof useDecks>["data"]>[number];

/** The lantern lights the top of the screen; no plate, the room itself is warm there. */
function LitDue({ decks, nothingYet }: { decks: Deck[]; nothingYet: boolean }) {
  const { t } = useLingui();
  const { fed, out, progress } = useDay();
  const router = useRouter();
  const p = usePalette();
  // At night the pool stays close to the lantern, so Today reads as the same room as every other screen.
  const room = useRoom();
  // The flame stops flickering while Today is out of sight.
  const focused = useIsFocused();
  const due = decks.reduce((n, d) => n + d.due, 0);
  const [onlyDeck] = decks.length === 1 ? decks : [];
  const noDecks = nothingYet && decks.length === 0;
  return (
    <View className="items-center gap-5 pb-2">
      <View
        pointerEvents="none"
        className="absolute -inset-x-5 -top-56 bottom-10"
        style={
          {
            experimental_backgroundImage: `radial-gradient(closest-side at 50% 52%, ${p.pool}, ${clear(p.pool)} ${room === "dark" ? 70 : 100}%)`,
          } as ViewStyle
        }
      />
      <Lantern
        size={150}
        progress={progress}
        out={out}
        fed={fed}
        flicker={focused}
        style={{ marginTop: 4 }}
      />
      <DueHeading due={due} nothingYet={nothingYet} noDecks={noDecks} deckName={onlyDeck?.name} />
      <View className="self-stretch">
        {due > 0 ? (
          <Button
            label={t`Review`}
            variant="primary"
            size="xl"
            onPress={() => startReview(router)}
          />
        ) : noDecks ? (
          // A stub until the phone can make a deck (#584).
          <Button label={t`New deck`} variant="primary" size="xl" disabled />
        ) : (
          // Nothing due is not nothing to do: capture is the standing action.
          <Button
            label={t`Add a card`}
            variant="primary"
            size="xl"
            onPress={() => router.push("/capture")}
          />
        )}
      </View>
    </View>
  );
}

/** The count and what it counts, read as one heading. With one deck, the deck is named here. */
function DueHeading({
  due,
  nothingYet,
  noDecks,
  deckName,
}: {
  due: number;
  nothingYet: boolean;
  noDecks: boolean;
  deckName: string | undefined;
}) {
  const { t } = useLingui();
  if (nothingYet) {
    return (
      <View className="items-center gap-1.5 px-4" accessible accessibilityRole="header">
        <Text className="text-3xl font-medium text-text">
          {noDecks ? t`Start with a deck` : t`No cards yet`}
        </Text>
        <Text className="text-center text-lg text-text-2">
          {noDecks
            ? t`Make one for each course or topic.`
            : t`Add cards from your last lesson, then review them here.`}
        </Text>
      </View>
    );
  }
  if (due === 0) {
    // Not "You’re done for today": a round below can still have cards to review.
    return (
      <Text className="text-3xl font-medium text-text" accessibilityRole="header">
        {t`Nothing due`}
      </Text>
    );
  }
  const what = deckName
    ? plural(due, { one: `card due in ${deckName}`, other: `cards due in ${deckName}` })
    : plural(due, { one: "card due today", other: "cards due today" });
  return (
    <View
      className="items-center gap-0.5"
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${due} ${what}`}
    >
      <Text
        className="text-6xl font-medium text-text"
        style={{ fontVariant: ["tabular-nums"], letterSpacing: -2 }}
      >
        {due}
      </Text>
      <Text className="text-center text-lg text-text-2">{what}</Text>
    </View>
  );
}

/** One line on where today stands against the streak: what is left, or that the day counts. */
function useTodayStatus(today: StreakOut["today"]): string {
  const { t } = useLingui();
  switch (today.outcome) {
    case "goal_met":
      return t`Daily goal reached.`;
    case "exhausted":
      return t`You’re done for today.`;
    case "nothing_due":
      return t`Nothing due today, so your streak is safe.`;
    default: {
      const left = Math.max(today.goal - today.attempts, 0);
      return t`${plural(left, { one: "# review", other: "# reviews" })} to today’s goal`;
    }
  }
}

/** The run, one plain line on today, and the week. The whole plate opens the streak. */
function StreakPlate({ summary }: { summary: StreakOut }) {
  const { t } = useLingui();
  const { streak, goal, dayDone, flame, lights } = useDay();
  const router = useRouter();
  const status = useTodayStatus(summary.today);
  return (
    <Press
      scale={0.98}
      onPress={() => router.push("/streak")}
      accessibilityRole="button"
      accessibilityLabel={`${t`Streak: ${plural(streak, { one: "# day in a row", other: "# days in a row" })}`}. ${status}`}
    >
      <Plate className="gap-5 p-5">
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <Flame height={30} state={flame} />
            <Text
              className="text-3xl font-medium text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {streak}
            </Text>
            <Text className="text-lg text-text-2">
              {plural(streak, { one: "day in a row", other: "days in a row" })}
            </Text>
          </View>
          <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {status}
          </Text>
        </View>
        <SevenLights
          days={lights.days}
          goal={goal}
          todayDone={dayDone}
          satisfied={lights.satisfied}
          rest={lights.rest}
          goals={lights.goals}
        />
      </Plate>
    </Press>
  );
}

/** Today's one mention of a rest day, the morning after. It never counts or warns. streak.md. */
function RestDayBanner({ current, onDismiss }: { current: number; onDismiss: () => void }) {
  const { t } = useLingui();
  return (
    <View className="flex-row items-center gap-4 rounded-xl bg-plate-2 py-3.5 ps-5 pe-2">
      <RestGlyph />
      <View className="flex-1 gap-0.5">
        <Text className="text-md font-medium text-text">{t`Yesterday was a rest day`}</Text>
        <Text className="text-base text-text-2">
          {plural(current, {
            one: "Your #-day streak carries on.",
            other: "Your #-day streak carries on.",
          })}
        </Text>
      </View>
      <IconButton icon="close" label={t`Dismiss`} size="sm" onPress={onDismiss} />
    </View>
  );
}

type RoundsData = NonNullable<ReturnType<typeof useRounds>["data"]>;

/**
 * Also on your list: the three rounds, always in this order, so none is ever left on its own. A
 * tile with cards opens its review; an empty one says so, and an empty New cards offers to add some.
 */
function Rounds({ rounds }: { rounds: RoundsData }) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const rows = [
    {
      n: rounds.forgotten,
      title: t`Forgotten today`,
      empty: t`Nothing forgotten today`,
      line: t`Graded Forgot today`,
      mark: "forgot" as const,
      tint: p["grade-forgot"],
      href: "/review?round=forgotten" as const,
    },
    {
      n: rounds.new,
      title: t`New cards`,
      empty: t`Add cards from your next lesson`,
      line: t`Not reviewed yet`,
      mark: "new" as const,
      tint: p["state-new"],
      href: "/review?round=new" as const,
    },
    {
      n: rounds.slipping,
      title: t`Often forgotten`,
      empty: t`No cards you keep forgetting`,
      line: t`Forgotten on ${SLIPPING_FORGOTTEN_DAYS} of the last ${plural(SLIPPING_RECENT_DAYS, { one: "# day", other: "# days" })} seen`,
      mark: undefined,
      tint: p.muted,
      href: "/review?round=slipping" as const,
    },
  ];
  return (
    <View>
      <SectionTitle>{t`Also on your list`}</SectionTitle>
      <View className="gap-3">
        {rows.map((r) => {
          const live = r.n > 0;
          const adds = !live && r.href === "/review?round=new";
          const face = (
            <Plate className="flex-row items-center gap-4 px-5 py-4">
              {/* One width for every count, so the three titles line up; a third digit shrinks to fit. */}
              <Text
                className={`w-14 text-3xl font-medium ${live ? "text-text" : "text-muted"}`}
                style={{ fontVariant: ["tabular-nums"] }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {r.n}
              </Text>
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-1.5">
                  {r.mark && <Icon name={r.mark} size={16} colour={r.tint} />}
                  <Text className="text-md font-medium text-text">{r.title}</Text>
                </View>
                <Text className="text-base text-muted">{live ? r.line : r.empty}</Text>
              </View>
              {live ? <RowArrow /> : adds ? <RowPlus /> : null}
            </Plate>
          );
          const label = `${r.n} ${r.title}. ${live ? r.line : r.empty}`;
          if (!live && !adds) {
            return (
              <View key={r.href} accessible accessibilityLabel={label}>
                {face}
              </View>
            );
          }
          return (
            <Press
              key={r.href}
              scale={0.98}
              onPress={() => (live ? startReview(router, r.href) : router.push("/capture"))}
              accessibilityRole={live ? "link" : "button"}
              accessibilityLabel={label}
              accessibilityHint={live ? undefined : t`Add a card`}
            >
              {face}
            </Press>
          );
        })}
      </View>
    </View>
  );
}

/** A plus in a circle: where an empty New cards tile offers to add some, as a row ends in an arrow. */
function RowPlus() {
  const p = usePalette();
  return (
    <View className="size-9 items-center justify-center rounded-full bg-plate-2">
      <Icon name="plus" size={16} colour={p["text-2"]} />
    </View>
  );
}

/**
 * The decks with something due, shown once there are two or more decks. A series stays as its
 * decks until the review can take one (#577); then it is one row, as on the web.
 */
function DecksToReview({ decks }: { decks: Deck[] }) {
  const { t } = useLingui();
  const router = useRouter();
  const rows = decks.filter((d) => d.due > 0);
  if (rows.length === 0) return null;
  return (
    <View>
      <SectionTitle
        end={
          <Press
            onPress={() => router.navigate("/library")}
            accessibilityRole="link"
            hitSlop={12}
            className="flex-row items-center gap-0.5 py-1"
          >
            <Text className="text-base font-medium text-text-2">{t`Library`}</Text>
          </Press>
        }
      >
        {t`Decks to review`}
      </SectionTitle>
      <Plate className="overflow-hidden">
        {rows.map((d, i) => {
          const line = plural(d.due, { one: "card due", other: "cards due" });
          return (
            <Press
              key={d.id}
              scale={0.99}
              onPress={() => startReview(router, `/review?deck=${d.id}`)}
              accessibilityRole="link"
              accessibilityLabel={`${d.name}. ${d.due} ${line}`}
            >
              <View
                className={`flex-row items-center gap-4 py-3.5 ps-5 pe-4 ${i > 0 ? "border-t border-edge" : ""}`}
              >
                {/* The count leads, as on the round tiles: it is what the row is for. */}
                <View className="h-8 min-w-10 items-center justify-center rounded-full bg-amber-tint px-2.5">
                  <Text
                    className="text-base font-medium text-amber-tint-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {d.due}
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-md font-medium text-text" numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text className="text-base text-muted">{line}</Text>
                </View>
                <RowArrow />
              </View>
            </Press>
          );
        })}
      </Plate>
    </View>
  );
}

/** The decks or the streak failed to load and nothing is kept, so Today offers to try again. */
function LoadFailed({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  return (
    <View className="items-center gap-1 py-16">
      <View className="mb-3 size-11 items-center justify-center rounded-full bg-danger-soft">
        <Icon name="alert" size={20} colour={p.danger} />
      </View>
      <Text className="text-lg font-medium text-text" accessibilityRole="header">
        {t`Couldn’t load Today`}
      </Text>
      <Text className="text-center text-base text-text-2">
        {t`Check your connection and try again.`}
      </Text>
      <View className="mt-4">
        <Button label={t`Try again`} variant="primary" loading={retrying} onPress={onRetry} />
      </View>
    </View>
  );
}
