import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { InsightsOut } from "@lymi/core";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Button, Plate, Press, RowArrow, SectionTitle, Text } from "../ui/primitives";
import { Segmented } from "../ui/segmented";
import { Skeleton } from "../ui/skeleton";
import { DayGrid } from "./day-grid";
import {
  asDate,
  CardShares,
  CardStates,
  ForecastBars,
  RecallTally,
  RunStrip,
  TREND_MIN_POINTS,
  TrendLine,
} from "./figures";

export type Period = "30" | "90" | "0";

interface Figure {
  key: "recall" | "consistency" | "cards" | "ahead";
  label: string;
  value: string;
  unit?: string | undefined;
  figure: ReactNode;
  /** The same figure at the size a row gives it; Recall never sits in a row. */
  small?: ReactNode;
  note: string;
  control?: ReactNode | undefined;
}

/** The four numbers, each with the line that makes it mean something. insights.md. */
function useFigures(data: InsightsOut, period: Period, onPeriod: (p: Period) => void): Figure[] {
  const { t, i18n } = useLingui();
  const pct = (v: number) => i18n.number(v, { style: "percent" });
  const { recall, consistency, cards, forecast } = data;
  const monthly = period === "0";
  const trend = recall.series.map((pt) => {
    const start = asDate(monthly ? `${pt.at}-01` : pt.at);
    return {
      at: pt.at,
      t: start.getTime(),
      value: pt.rate,
      long: monthly
        ? i18n.date(start, { month: "long", timeZone: "UTC" })
        : t`week of ${i18n.date(start, { day: "numeric", month: "short", timeZone: "UTC" })}`,
      short: monthly
        ? i18n.date(start, { month: "short", timeZone: "UTC" })
        : i18n.date(start, { day: "numeric", month: "short", timeZone: "UTC" }),
    };
  });
  const series = trend.map((pt) => `${pt.long} ${pct(pt.value)}`).join(", ");
  const graded = recall.passed + recall.failed;
  const trendLabel = monthly
    ? t`Recall by month: ${series}. The schedule aims for 90%.`
    : t`Recall by week: ${series}. The schedule aims for 90%.`;
  const recallFigure =
    trend.length >= TREND_MIN_POINTS ? (
      <TrendLine points={trend} target={0.9} targetLabel={pct(0.9)} label={trendLabel} />
    ) : graded > 0 ? (
      <RecallTally passed={recall.passed} failed={recall.failed} />
    ) : (
      <TrendLine points={[]} target={0.9} targetLabel={pct(0.9)} label="" />
    );

  const busiest = forecast.reduce(
    (a, b) => (b.count > a.count ? b : a),
    forecast[0] ?? { date: "", count: 0 },
  );
  const busiestIsToday = busiest.date === forecast[0]?.date;
  const dueSoon = forecast.reduce((n, d) => n + d.count, 0);
  const weekday = i18n.date(asDate(busiest.date || "2026-01-01"), {
    weekday: "long",
    timeZone: "UTC",
  });
  const days = consistency.daysAllTime;

  return [
    {
      key: "recall",
      label: t`Recall`,
      value: recall.rate === null ? "—" : pct(recall.rate),
      figure: recallFigure,
      note:
        recall.rate === null
          ? t`No recall data yet. Review more cards to see how you’re doing.`
          : t`${recall.passed} remembered, ${recall.failed} forgotten.`,
      control:
        days > 30 ? (
          <Segmented
            label={t`Recall period`}
            value={period}
            onChange={onPeriod}
            options={[
              { value: "30", label: t`30 days` },
              ...(days > 90 ? [{ value: "90" as const, label: t`90 days` }] : []),
              { value: "0", label: t`All` },
            ]}
          />
        ) : undefined,
    },
    {
      key: "consistency",
      label: t`Consistency`,
      value: i18n.number(consistency.lit),
      unit: t`/ ${plural(consistency.days.length, { one: "# day", other: "# days" })}`,
      figure: <RunStrip days={consistency.days} />,
      small: <RunStrip days={consistency.days} height={24} />,
      note:
        consistency.lit === 0
          ? t`No reviews yet. Each day you review adds a block.`
          : consistency.longestRun > 1
            ? t`${plural(consistency.longestRun, {
                one: "Longest stretch: # day in a row.",
                other: "Longest stretch: # days in a row.",
              })}`
            : t`Each block is one day you reviewed.`,
    },
    {
      key: "cards",
      label: t`Cards`,
      value: i18n.number(cards.total),
      unit: t`${plural(cards.total, { one: "card", other: "cards" })}`,
      figure: <CardStates cards={cards} />,
      small: <CardShares cards={cards} />,
      note:
        cards.total === 0
          ? t`No cards yet`
          : t`${pct(cards.known / cards.total)} of your cards are known.`,
    },
    {
      key: "ahead",
      label: t`Ahead`,
      value: i18n.number(dueSoon),
      unit: t`due this week`,
      figure: <ForecastBars forecast={forecast} />,
      small: <ForecastBars forecast={forecast} height={28} compact />,
      note:
        dueSoon === 0
          ? t`Nothing due in the next seven days.`
          : busiestIsToday
            ? t`${plural(busiest.count, {
                one: "Today is the busiest day, with # card.",
                other: "Today is the busiest day, with # cards.",
              })}`
            : t`${weekday} is the busiest day, with ${plural(busiest.count, {
                one: "# card",
                other: "# cards",
              })}.`,
    },
  ];
}

function Label({ children }: { children: string }) {
  return (
    <Text className="text-sm font-medium uppercase text-muted" style={{ letterSpacing: 0.8 }}>
      {children}
    </Text>
  );
}

function Value({
  value,
  unit,
  size = "lg",
}: {
  value: string;
  unit?: string | undefined;
  size?: "lg" | "md";
}) {
  return (
    <Text
      className={`${size === "lg" ? "text-3xl" : "text-2xl"} font-medium tracking-tight text-text`}
    >
      {value}
      {unit && (
        <Text className={`${size === "lg" ? "text-lg" : "text-base"} font-normal text-muted`}>
          {" "}
          {unit}
        </Text>
      )}
    </Text>
  );
}

/** One number, its figure and its line on a plate of its own. */
function StatPlate({ f }: { f: Figure }) {
  return (
    <Plate className="gap-3 p-5">
      <Label>{f.label}</Label>
      {f.control}
      <Value value={f.value} unit={f.unit} />
      <View className="min-h-[74px] justify-center">{f.figure}</View>
      <Text className="text-base text-muted">{f.note}</Text>
    </Plate>
  );
}

/**
 * Recall at full size with its period, then Consistency, Cards and Ahead as rows on one plate, each
 * figure beside its number and its line under both. The phone's form of the web's 2x2 grid, which
 * at phone width leaves each line too narrow to read.
 */
function Figures({ figures }: { figures: Figure[] }) {
  const [recall, ...rest] = figures;
  if (!recall) return null;
  return (
    <View className="gap-4">
      <StatPlate f={recall} />
      <Plate className="overflow-hidden">
        {rest.map((f, i) => (
          <View key={f.key} className={`gap-2 px-5 py-4 ${i > 0 ? "border-t border-edge" : ""}`}>
            <Label>{f.label}</Label>
            <View className="flex-row items-center gap-4">
              <View className="shrink-0">
                <Value value={f.value} unit={f.unit} size="md" />
              </View>
              <View className="flex-1 items-end">{f.small}</View>
            </View>
            <Text className="text-base text-muted">{f.note}</Text>
          </View>
        ))}
      </Plate>
    </View>
  );
}

function DayByDay({ activity }: { activity: InsightsOut["activity"] }) {
  const { t } = useLingui();
  if (!activity.firstDay) return null;
  return (
    <View>
      <SectionTitle>{t`Day by day`}</SectionTitle>
      <Plate className="p-5">
        <DayGrid
          days={activity.days}
          today={activity.today}
          firstDay={activity.firstDay}
          goal={activity.goal}
        />
      </Plate>
    </View>
  );
}

/** The cards that keep slipping; each opens the deck that holds it. */
function OftenForgotten({ leeches }: { leeches: InsightsOut["leeches"] }) {
  const { t } = useLingui();
  const router = useRouter();
  if (leeches.cards.length === 0) return null;
  return (
    <View>
      <SectionTitle>{t`Often forgotten`}</SectionTitle>
      <Text className="-mt-2 px-1 pb-3 text-base text-muted">
        <Trans>
          Forgotten on {leeches.forgottenDays} of the last{" "}
          <Plural value={leeches.recentDays} one="# day" other="# days" /> seen
        </Trans>
      </Text>
      <Plate className="overflow-hidden">
        {leeches.cards.map((c, i) => (
          <Press
            key={c.id}
            scale={0.99}
            onPress={() => router.push(`/library/${c.deckId}`)}
            accessibilityRole="link"
          >
            <View
              className={`min-h-[52px] flex-row items-center gap-3 ps-4 pe-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
            >
              {/* The term and how often it slipped: the card in its deck holds the rest. */}
              <Text className="flex-1 text-md text-text" numberOfLines={2}>
                {c.term}
              </Text>
              <Text className="text-md text-muted">{t`${plural(c.lapses, { one: "# forgotten", other: "# forgotten" })}`}</Text>
              <RowArrow />
            </View>
          </Press>
        ))}
      </Plate>
    </View>
  );
}

interface Props {
  data: InsightsOut | undefined;
  period: Period;
  onPeriod: (p: Period) => void;
  failed: boolean;
  busy: boolean;
  onRetry: () => void;
}

export function InsightsView({ data, period, onPeriod, failed, busy, onRetry }: Props) {
  if (failed) return <Failed onRetry={onRetry} busy={busy} />;
  if (!data) return <Loading />;
  if (data.consistency.daysAllTime === 0 && data.cards.total === 0) return <NothingYet />;
  return <Loaded data={data} period={period} onPeriod={onPeriod} busy={busy} />;
}

function Loaded({
  data,
  period,
  onPeriod,
  busy,
}: {
  data: InsightsOut;
  period: Period;
  onPeriod: (p: Period) => void;
  busy: boolean;
}) {
  const figures = useFigures(data, period, onPeriod);
  const graded = data.recall.passed + data.recall.failed;
  return (
    <>
      <View className={busy ? "opacity-60" : undefined}>
        <Figures figures={figures} />
      </View>
      <DayByDay activity={data.activity} />
      <OftenForgotten leeches={data.leeches} />
      {graded > 0 && graded < 30 && (
        <Text className="px-1 text-base text-muted">
          <Plural
            value={graded}
            one="Recall is based on only # review, so it can swing a lot for the first few weeks."
            other="Recall is based on only # reviews, so it can swing a lot for the first few weeks."
          />
        </Text>
      )}
    </>
  );
}

function Loading() {
  return (
    <View className="gap-4">
      <Plate className="gap-3 p-5">
        <Skeleton width={80} height={12} />
        <Skeleton width={120} height={34} />
        <Skeleton height={74} />
      </Plate>
      <Plate className="overflow-hidden">
        {[0, 1, 2].map((i) => (
          <View key={i} className={`gap-2 px-5 py-4 ${i > 0 ? "border-t border-edge" : ""}`}>
            <Skeleton width={96} height={12} />
            <Skeleton width={140} height={28} />
          </View>
        ))}
      </Plate>
    </View>
  );
}

function Failed({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  const { t } = useLingui();
  return (
    <Plate className="items-start gap-3 p-5">
      <Text className="text-md font-medium text-text">{t`Couldn’t load Insights`}</Text>
      <Button label={t`Try again`} onPress={onRetry} loading={busy} />
    </Plate>
  );
}

function NothingYet() {
  const { t } = useLingui();
  return (
    <Plate className="gap-2 p-5">
      <Text className="text-md font-medium text-text">{t`Insights start after your first review`}</Text>
      <Text className="text-base text-muted">
        {t`Add cards and review them to see your progress here.`}
      </Text>
    </Plate>
  );
}
