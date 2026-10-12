import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS, type StreakOut } from "@lymi/core";
import { flameSize } from "@lymi/design";
import * as Haptics from "expo-haptics";
import { type Href, useIsFocused, useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Flame } from "../../../brand/flame";
import { Lantern } from "../../../brand/lantern";
import { REST_DISMISSED_KEY, todayStore } from "../../../data/kept";
import { useDay, useDecks, useRounds, useStreak } from "../../../data/queries";
import { useLandingSpot } from "../../../splash/landing";
import { clear, usePalette, useRoom } from "../../../theme/palette";
import { OfflineNote, useKeptSince } from "../../../ui/offline-note";
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
  // Offline with nothing kept yet, the reads wait rather than fail, so waiting counts as failing here.
  const unloaded = (q: typeof decks | typeof streak) =>
    !q.data && (q.isError || q.fetchStatus === "paused");
  const failed = unloaded(decks) || unloaded(streak);
  const loading = (!decks.data || !streak.data) && !failed;
  const nothingYet = !loading && total === 0;
  const kept = !!useKeptSince(decks);

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
  const due = kept && left !== undefined ? left : decks.reduce((n, d) => n + d.due, 0);
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
 * One row of Today's lists: what it is on the start edge, how many at the end, then a chevron
 * when it opens a review or a plus when it adds. A row that does nothing has neither.
 */
function ListRow({
  first,
  title,
  mark,
  line,
  count,
  end,
  countLabel,
  onPress,
  hint,
}: {
  first: boolean;
  title: string;
  mark?: ReactNode;
  /** Under the title; left out where the section already says what the count is. */
  line?: string;
  /** What VoiceOver reads for the count when no line says it. */
  countLabel?: string;
  count?: number;
  end: "open" | "add" | "none";
  onPress?: (() => void) | undefined;
  hint?: string | undefined;
}) {
  const p = usePalette();
  const face = (
    <View
      className={`flex-row items-center gap-3 py-3.5 ps-5 pe-4 ${first ? "" : "border-t border-edge"}`}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          {mark}
          <Text className="shrink text-md font-medium text-text" numberOfLines={1}>
            {title}
          </Text>
        </View>
        {line && <Text className="text-base text-muted">{line}</Text>}
      </View>
      {count !== undefined && end !== "add" && (
        <Text
          className={`text-2xl font-medium ${count > 0 ? "text-text" : "text-muted"}`}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {count}
        </Text>
      )}
      {/* The slot stays on a row that does nothing, so every count ends on the same line. */}
      {end === "open" ? (
        <RowArrow />
      ) : end === "add" ? (
        <Icon name="plus" size={18} colour={p.muted} strokeWidth={2.5} />
      ) : (
        <View className="w-[18px]" />
      )}
    </View>
  );
  const label = [title, countLabel ?? count, line].filter((part) => part !== undefined).join(". ");
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label}>
        {face}
      </View>
    );
  }
  return (
    <Press
      scale={0.99}
      onPress={onPress}
      accessibilityRole={end === "add" ? "button" : "link"}
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      {face}
    </Press>
  );
}

/**
 * The decks with something due, shown once there are two or more decks. A series stays as its
 * decks until the review can take one (#577); then it is one row, as on the web.
 */
function DecksToReview({ decks }: { decks: Deck[] }) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const rows = decks.filter((d) => d.due > 0);
  if (rows.length === 0) return null;
  const items = rows.map((d, i) => (
    <ListRow
      key={d.id}
      first={i === 0}
      title={d.name}
      count={d.due}
      countLabel={plural(d.due, { one: "# card due", other: "# cards due" })}
      end="open"
      onPress={() => startReview(router, `/review?deck=${d.id}`)}
    />
  ));
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
