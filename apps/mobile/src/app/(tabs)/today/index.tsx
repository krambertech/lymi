import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { groupDecks } from "@lymi/client/library-groups";
import { exploreQuery } from "@lymi/client/queries";
import { shownOutcome } from "@lymi/client/review-day";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS, type StreakOut } from "@lymi/core";
import { flameSize } from "@lymi/design";
import { useQuery } from "@tanstack/react-query";
import { type Href, useIsFocused, useRouter } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Flame } from "../../../brand/flame";
import { Lantern } from "../../../brand/lantern";
import { dueToday } from "../../../data/due";
import { REST_DISMISSED_KEY, todayStore } from "../../../data/kept";
import {
  useDay,
  useDecks,
  useKeptSince,
  useRounds,
  useSeriesList,
  useStreak,
} from "../../../data/queries";
import { useLandingSpot } from "../../../splash/landing";
import { haptics } from "../../../theme/haptics";
import { clear, usePalette, useRoom } from "../../../theme/palette";
import { ListRow, ListRowFace, listRowLabel } from "../../../ui/list-row";
import { OfflineNote } from "../../../ui/offline-note";
import { Button, Icon, IconButton, Plate, Press, SectionTitle, Text } from "../../../ui/primitives";
import { RestGlyph } from "../../../ui/rest-glyph";
import { RowMenu } from "../../../ui/row-menu";
import { Screen } from "../../../ui/screen";
import { SevenLights } from "../../../ui/seven-lights";
import { Skeleton } from "../../../ui/skeleton";
import { useStreakStart } from "../../../ui/streak-start";
import { takeAfterWelcome } from "../../../welcome/gate";
import { ReadyDecks } from "../../../welcome/ready-decks";
import { BringYourOwn, StartGuide } from "../../../welcome/start-guide";

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
  // Offline with nothing kept yet, the reads wait rather than fail, so waiting counts as failing here.
  const unloaded = (q: typeof decks | typeof streak) =>
    !q.data && (q.isError || q.fetchStatus === "paused");
  const failed = unloaded(decks) || unloaded(streak);
  const loading = (!decks.data || !streak.data) && !failed;
  const nothingYet = !loading && total === 0;
  const kept = !!useKeptSince(decks);
  // Until the first review, Today is the getting started guide.
  const guiding =
    !!decks.data &&
    !!streak.data &&
    streak.data.reviewedDays === 0 &&
    streak.data.today.attempts === 0;
  // Only the guide offers ready-made decks, so nobody past it pays for the catalogue read.
  const explore = useQuery({ ...exploreQuery, enabled: guiding });
  const ready = explore.data?.decks.filter((deck) => !explore.data.added[deck.slug]);
  useAfterWelcome();

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
  if (guiding && decks.data) {
    return (
      <Screen title={t`Today`} kind="tab">
        <StartGuide decks={decks.data} />
        {/* Only under the guide: a learner past their first review has their own work to get on with. */}
        {ready && ready.length > 0 && <ReadyDecks decks={ready} />}
        <BringYourOwn />
      </Screen>
    );
  }
  return (
    <Screen title={t`Today`} kind="tab">
      {/* The banner sits at the cards' own gap, because it is about the streak below it. */}
      <View className="gap-3">
        {!loading && <OfflineNote query={decks} />}
        {!loading && day.restedYesterday && !rest.dismissed && (
          <RestDayBanner current={day.streak} onDismiss={rest.dismiss} />
        )}
        {loading ? (
          <View className="items-center gap-5 pt-4">
            <LanternSpot>
              <Skeleton width={150} height={150} />
            </LanternSpot>
            <Skeleton width={120} height={40} />
            <Skeleton height={64} />
          </View>
        ) : (
          <LitDue decks={decks.data ?? []} nothingYet={nothingYet} kept={kept} />
        )}
        {loading ? (
          <Skeleton height={150} />
        ) : (
          !nothingYet && day.summary && <StreakPlate summary={day.summary} />
        )}
      </View>
      {!loading && decks.data && decks.data.length > 1 && <DecksToReview decks={decks.data} />}
      {!loading && !nothingYet && rounds.data && <Rounds rounds={rounds.data} />}
    </Screen>
  );
}

/** Where Welcome sent the learner on, such as their first review, opened once Today is back. */
function useAfterWelcome() {
  const router = useRouter();
  useEffect(() => {
    const then = takeAfterWelcome();
    if (then) router.push(then);
  }, [router]);
}

function startReview(router: ReturnType<typeof useRouter>, href: Href = "/review") {
  haptics.start();
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
function LitDue({
  decks,
  nothingYet,
  kept,
}: {
  decks: Deck[];
  nothingYet: boolean;
  /** The decks are as of the last sync, so their counts miss grades and days since. */
  kept: boolean;
}) {
  const { t } = useLingui();
  const { fed, out, progress, left } = useDay();
  const router = useRouter();
  const p = usePalette();
  // At night the pool stays close to the lantern, so Today reads as the same room as every other screen.
  const room = useRoom();
  // The flame stops flickering while Today is out of sight.
  const focused = useIsFocused();
  const due = dueToday(decks, left, kept);
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
      <LanternSpot style={{ marginTop: 4 }} flame={flameSize(progress, out)}>
        <Lantern size={150} progress={progress} out={out} fed={fed} flicker={focused} />
      </LanternSpot>
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
          <Button
            label={t`New deck`}
            variant="primary"
            size="xl"
            onPress={() => router.push("/new-deck")}
          />
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

/** Where the splash's lantern lands on a cold start. */
function LanternSpot({
  children,
  style,
  flame,
}: {
  children: ReactNode;
  style?: ViewStyle;
  flame?: number;
}) {
  const spot = useLandingSpot("today", 150, flame);
  return (
    <View ref={spot.ref} onLayout={spot.onLayout} style={[style, spot.style]}>
      {children}
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
function useTodayStatus(today: StreakOut["today"], due: number): string {
  const { t } = useLingui();
  switch (shownOutcome(today.outcome, due)) {
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
  const { streak, goal, dayDone, flame, lights, left } = useDay();
  const router = useRouter();
  const status = useTodayStatus(summary.today, left ?? 0);
  const start = useStreakStart(summary.longest);
  return (
    <Press
      scale={0.98}
      onPress={() => router.push("/streak")}
      accessibilityRole="button"
      accessibilityLabel={`${streak > 0 ? t`Streak: ${plural(streak, { one: "# day in a row", other: "# days in a row" })}` : start}. ${status}`}
    >
      <Plate className="gap-5 p-5">
        <View className="gap-1.5">
          <View className="flex-row items-center gap-2.5">
            <Flame height={30} state={flame} />
            {streak > 0 ? (
              <>
                <Text
                  className="text-3xl font-medium text-text"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {streak}
                </Text>
                <Text className="text-lg text-text-2">
                  {plural(streak, { one: "day in a row", other: "days in a row" })}
                </Text>
              </>
            ) : (
              <Text className="text-xl font-medium text-text">{start}</Text>
            )}
          </View>
          <Text className="text-base text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            {status}
          </Text>
        </View>
        <SevenLights
          dates={lights.dates}
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
 * round with cards opens its review; an empty one says so, and an empty New cards offers to add some.
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
  const items = rows.map((r, i) => {
    const live = r.n > 0;
    const adds = !live && r.href === "/review?round=new";
    return (
      <ListRow
        key={r.href}
        first={i === 0}
        title={r.title}
        mark={r.mark && <Icon name={r.mark} size={16} colour={r.tint} />}
        line={live ? r.line : r.empty}
        count={r.n}
        end={live ? "open" : adds ? "add" : "none"}
        onPress={
          live
            ? () => startReview(router, r.href)
            : adds
              ? () => router.push("/capture")
              : undefined
        }
        hint={adds ? t`Add a card` : undefined}
      />
    );
  });
  return (
    <View>
      <SectionTitle>{t`Also on your list`}</SectionTitle>
      <Plate className="overflow-hidden">{items}</Plate>
    </View>
  );
}

/**
 * The decks with something due, shown once there are two or more decks. A series is what the
 * learner chose to review together, so it is one row and its decks get none, as on the web.
 */
function DecksToReview({ decks }: { decks: Deck[] }) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const series = useSeriesList(true).data;
  const groups = groupDecks(decks, series);
  const rows = [
    ...groups.loose
      .filter((d) => d.due > 0)
      .map((d) => ({
        key: d.id,
        name: d.name,
        due: d.due,
        decks: 0,
        review: `/review?deck=${d.id}`,
        deck: d,
      })),
    ...groups.series.flatMap(({ series: s, decks: inSeries }) => {
      const due = inSeries.reduce((n, d) => n + d.due, 0);
      return due > 0
        ? [
            {
              key: s.id,
              name: s.name,
              due,
              decks: inSeries.filter((d) => d.due > 0).length,
              review: `/review?series=${s.id}`,
              deck: null,
            },
          ]
        : [];
    }),
  ];
  if (rows.length === 0) return null;
  const items = rows.map((r, i) => {
    const line =
      r.decks > 0
        ? t`${plural(r.due, { one: "card due", other: "cards due" })} in ${plural(r.decks, { one: "# deck", other: "# decks" })}`
        : undefined;
    const review = () => startReview(router, r.review as Href);
    const deck = r.deck;
    // A deck peeks at its page and opens it; a series lives in Library, among its decks.
    const href = (deck ? `/library/${deck.id}` : "/library") as Href;
    return (
      <RowMenu
        key={r.key}
        surface={deck ? "today_row" : "series_row"}
        href={href}
        onPress={review}
        kind="button"
        label={listRowLabel(
          r.name,
          plural(r.due, { one: "# card due", other: "# cards due" }),
          line,
        )}
        preview={deck ? "page" : undefined}
        items={[
          [
            { id: "review", label: t`Review`, icon: "play", onSelect: review },
            ...(deck?.role === "owner"
              ? [
                  {
                    id: "add_card" as const,
                    label: t`Add a card`,
                    icon: "plus" as const,
                    onSelect: () => router.push(`/capture?deck=${deck.id}` as Href),
                  },
                ]
              : []),
            deck
              ? {
                  id: "open",
                  label: t`Open deck`,
                  icon: "deck",
                  onSelect: () => router.push(href),
                }
              : {
                  id: "open",
                  label: t`Show in Library`,
                  icon: "library",
                  onSelect: () => router.navigate(href),
                },
          ],
        ]}
      >
        <View className="bg-plate">
          <ListRowFace first={i === 0} title={r.name} count={r.due} line={line} end="open" />
        </View>
      </RowMenu>
    );
  });
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
            <Icon name="forward" size={16} colour={p["text-2"]} strokeWidth={2.5} />
          </Press>
        }
      >
        {t`Decks to review`}
      </SectionTitle>
      <Plate className="overflow-hidden">{items}</Plate>
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
