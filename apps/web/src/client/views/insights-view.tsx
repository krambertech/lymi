import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { type InsightsOut, localDate } from "@lymi/core";
import { clsx } from "clsx";
import { Button } from "../components/button";
import { Chip } from "../components/chip";
import { ErrorState } from "../components/empty-state";
import { MonthBars } from "../components/month-bars";
import { RecallTally } from "../components/recall-tally";
import { RunStrip } from "../components/run-strip";
import { Segmented } from "../components/segmented";
import { Skeleton } from "../components/skeleton";
import { StartPanel } from "../components/start-panel";
import { StatPlate } from "../components/stat-plate";
import { StateIcon, stateMarks } from "../components/state-mark";
import { addDays } from "../components/streak-calendar";
import { TREND_MIN_POINTS, TrendLine } from "../components/trend-line";
import { deviceTimezone } from "../lib/api";
import { Page, PageHeader } from "./shell";

export type Period = "30" | "90" | "0";

export interface InsightsProps {
  data: InsightsOut | undefined;
  period: Period;
  onPeriod: (p: Period) => void;
  /** The request failed and there is nothing cached to fall back on. */
  failed?: boolean | undefined;
  /** A refetch is in flight. The previous period stays on screen while it lands. */
  busy?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  /** Opens capture, offered while there are no cards to have insights about. */
  onAdd?: (() => void) | undefined;
}

/** A stat plate's settled size, so loading does not jump when the plates land. */
const PLATE_SLOT = "h-[223px] rounded-xl";

/** Parses a local YYYY-MM-DD without letting the timezone shift it a day. */
function parseLocal(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/**
 * The one screen where charts belong, and the only one where looking at them is a choice.
 * Four numbers, each with the sentence that makes it mean something, then the months, then
 * the cards that keep slipping.
 *
 * Every figure draws in ink except the lights, which stay amber because they are the
 * streak's lights. A chart series in amber would make this the one screen where the accent
 * means "data" rather than "act".
 */
export function InsightsView({
  data,
  period,
  onPeriod,
  failed,
  busy,
  onRetry,
  onAdd,
}: InsightsProps) {
  const { t, i18n } = useLingui();
  /* Formatters follow the interface language, which can change while this screen is open. */
  const longWeekday = (date: string) => i18n.date(parseLocal(date), { weekday: "long" });
  /* Every percentage on this screen goes through one formatter; uk and ru space the sign. */
  const pct = (v: number) => i18n.number(v, { style: "percent" });

  // On the Recall plate's label row rather than in the page header: in the header the same
  // control reads as a filter for the whole screen, and it moves this one figure only.
  //
  // Only the periods the history can actually tell apart are offered, and none at all until
  // there are more than thirty days of it. Three buttons that all return the same number
  // read as a broken control rather than a choice.
  const periodSwitcher = (daysAllTime: number) => {
    if (daysAllTime <= 30) return undefined;
    return (
      <Segmented
        size="sm"
        label={t`How far back the recall figure looks`}
        value={period}
        onChange={onPeriod}
        options={[
          { value: "30", label: t`30 days` },
          ...(daysAllTime > 90 ? [{ value: "90" as const, label: t`90 days` }] : []),
          { value: "0", label: t`All` },
        ]}
      />
    );
  };

  if (failed) {
    return (
      <Page>
        <PageHeader title={t`Insights`} />
        <ErrorState
          title={t`Couldn’t load Insights`}
          onRetry={onRetry}
          retrying={busy}
          className="flex-1"
        />
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <PageHeader title={t`Insights`} />
        {/* Same heights the plates settle at, so the screen does not jump when they land. */}
        <div className="grid gap-3 @3xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={PLATE_SLOT} />
          ))}
        </div>
        <Skeleton className="mt-3 h-[105px] rounded-xl" />
      </Page>
    );
  }

  const { recall, consistency, months, cards, forecast, leeches } = data;
  const { daysAllTime } = consistency;
  const nothingYet = daysAllTime === 0 && cards.total === 0;

  if (nothingYet) {
    const empty = { total: 0, new: 0, learning: 0, known: 0 };
    const today = localDate(new Date(), deviceTimezone());
    const week = Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i), count: 0 }));
    return (
      <Page>
        <PageHeader title={t`Insights`} />
        <StartPanel
          className="mb-3"
          title={<Trans>Insights start after your first review</Trans>}
          body={<Trans>Add cards and review them, and these fill in.</Trans>}
          action={
            onAdd && (
              <Button variant="primary" onClick={onAdd} kbd="N" className="justify-self-start">
                <Trans>Add a card</Trans>
              </Button>
            )
          }
        />
        {/* The real plates, outlined and at zero, so the screen shows what will fill it. */}
        <div className="grid gap-3 @3xl:grid-cols-2" aria-hidden="true">
          <StatPlate
            ghost
            label={t`Recall`}
            value="—"
            /* The real chart with nothing in it, so the reference cannot sit somewhere the
               live chart would never put it. */
            figure={<TrendLine points={[]} target={0.9} targetLabel={pct(0.9)} label="" />}
            note={t`How often you remember a card when it comes back`}
          />
          <StatPlate
            ghost
            label={t`Consistency`}
            value={0}
            unit={t`/ ${plural(30, { one: "# day", other: "# days" })}`}
            figure={
              <RunStrip
                days={Array.from({ length: 30 }, (_, i) => ({ date: String(i), lit: false }))}
              />
            }
            note={t`Which days you reviewed`}
          />
          <StatPlate
            ghost
            label={t`Cards`}
            value={0}
            unit={t`${plural(0, { one: "card", other: "cards" })}`}
            figure={<CardSplit cards={empty} />}
            note={<CardChips cards={empty} />}
          />
          <StatPlate
            ghost
            label={t`Ahead`}
            value={0}
            unit={t`due this week`}
            figure={<ForecastBars forecast={week} />}
            note={t`How many cards come back this week`}
          />
        </div>
      </Page>
    );
  }

  const graded = recall.passed + recall.failed;
  const monthly = period === "0";
  const trend = recall.series.map((p) => {
    const start = parseLocal(monthly ? `${p.at}-01` : p.at);
    return {
      at: p.at,
      t: start.getTime(),
      value: p.rate,
      label: monthly
        ? i18n.date(start, { month: "long" })
        : t`week of ${i18n.date(start, { day: "numeric", month: "short" })}`,
      /* The chart's own end labels, short enough to sit under the plot. */
      short: monthly
        ? i18n.date(start, { month: "short" })
        : i18n.date(start, { day: "numeric", month: "short" }),
    };
  });
  const series = trend.map((p) => `${p.label} ${pct(p.value)}`).join(", ");
  // Ties keep the earliest day, so the sentence names the one the learner reaches first.
  const busiest = forecast.reduce(
    (a, b) => (b.count > a.count ? b : a),
    forecast[0] ?? { date: "", count: 0 },
  );
  const busiestIsToday = busiest.date === forecast[0]?.date;
  const dueSoon = forecast.reduce((n, d) => n + d.count, 0);
  const monthLit = months.reduce((n, m) => n + m.lit, 0);

  return (
    <Page>
      <PageHeader
        title={t`Insights`}
        sub={
          daysAllTime > 0
            ? t`${plural(daysAllTime, {
                one: "# day since your first review",
                other: "# days since your first review",
              })}`
            : undefined
        }
      />

      <div
        className={clsx(
          "grid gap-3 transition-opacity duration-150 @3xl:grid-cols-2",
          busy && "opacity-60",
        )}
      >
        <StatPlate
          label={t`Recall`}
          control={periodSwitcher(daysAllTime)}
          value={recall.rate === null ? "—" : pct(recall.rate)}
          /* Too few weeks to have a trend draws the sample the figure is made of instead.
             One bucket has no shape at all: a line through a single point strokes nothing,
             leaving a lone dot in an empty plate. */
          figure={
            trend.length >= TREND_MIN_POINTS ? (
              <TrendLine
                points={trend}
                target={0.9}
                targetLabel={pct(0.9)}
                label={
                  monthly
                    ? t`Recall by month: ${series}. The schedule aims for 90%.`
                    : t`Recall by week: ${series}. The schedule aims for 90%.`
                }
              />
            ) : graded > 0 ? (
              <RecallTally passed={recall.passed} failed={recall.failed} />
            ) : (
              /* Nothing graded yet: the reference alone, exactly as the ghost draws it. */
              <TrendLine points={[]} target={0.9} targetLabel={pct(0.9)} label="" />
            )
          }
          note={
            recall.rate === null
              ? t`Nothing has come back for a second look yet, so there is nothing honest to report.`
              : t`${recall.passed} remembered, ${recall.failed} forgotten.`
          }
        />

        <StatPlate
          label={t`Consistency`}
          value={consistency.lit}
          unit={t`/ ${plural(consistency.days.length, { one: "# day", other: "# days" })}`}
          figure={<RunStrip days={consistency.days} />}
          note={
            consistency.lit === 0
              ? t`No reviews yet. Each block here will be a day.`
              : consistency.longestRun > 1
                ? t`${plural(consistency.longestRun, {
                    one: "Longest run # day. Unbroken stretches join up.",
                    other: "Longest run # days. Unbroken stretches join up.",
                  })}`
                : t`Each block is a day. They join up when you keep going.`
          }
        />

        <StatPlate
          label={t`Cards`}
          value={cards.total}
          unit={t`${plural(cards.total, { one: "card", other: "cards" })}`}
          figure={<CardSplit cards={cards} />}
          note={<CardChips cards={cards} />}
        />

        <StatPlate
          label={t`Ahead`}
          value={dueSoon}
          unit={t`due this week`}
          figure={<ForecastBars forecast={forecast} />}
          /* The heaviest day moves into the sentence, where it can be said in words. As the
             plate's headline it had to be compressed to "peak", which is a statistics term
             in an app that writes plain lines. */
          note={
            dueSoon === 0
              ? t`Nothing comes back in the next seven days.`
              : busiestIsToday
                ? t`${plural(busiest.count, {
                    one: "Today is the busiest day, with # card.",
                    other: "Today is the busiest day, with # cards.",
                  })}`
                : t`${longWeekday(busiest.date)} is the busiest day, with ${plural(busiest.count, {
                    one: "# card",
                    other: "# cards",
                  })}.`
          }
        />
      </div>

      {months.length > 0 && (
        <section className="edge mt-3 flex flex-col gap-4 rounded-xl bg-plate p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">
              <Trans>Month by month</Trans>
            </h2>
            {/* A count, not a ratio. Each bar carries its own denominator; summing them
                would total calendar days from before the learner had an account. */}
            <span className="text-xs text-muted tabular-nums">
              <Plural value={monthLit} one="# day reviewed" other="# days reviewed" />
            </span>
          </div>
          <MonthBars months={months} />
        </section>
      )}

      {leeches.cards.length > 0 && (
        <section className="edge mt-3 overflow-hidden rounded-xl bg-plate">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-3">
            <h2 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">
              <Trans>Keeps slipping</Trans>
            </h2>
            <span className="text-xs text-muted">
              <Trans>Forgotten {leeches.lapses}+ times</Trans>
            </span>
          </div>
          <ul>
            {leeches.cards.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 border-t border-edge px-5 py-3"
              >
                {/* The card in its deck holds the whole text; this row only has to be recognised. */}
                <span className="line-clamp-3 min-w-0 [overflow-wrap:anywhere]">
                  <span className="font-medium text-text" lang={c.language ?? undefined}>
                    {c.term}
                  </span>
                  {c.meaning && <span className="ms-2 text-sm text-muted">{c.meaning}</span>}
                </span>
                {/* Both numbers carry their unit: "7 of 12" alone leaves the reader to
                    guess which is which, even under the heading. */}
                <span className="shrink-0 text-right text-sm text-muted tabular-nums">
                  <Trans>
                    {c.lapses} forgotten <span className="text-muted/60">·</span>{" "}
                    <Plural value={c.reviews} one="# review" other="# reviews" />
                  </Trans>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {graded > 0 && graded < 30 && (
        <p className="mt-5 px-1 text-sm text-muted">
          <Plural
            value={graded}
            one="Recall is drawn from # review, which is few enough that one bad evening moves it. It settles down after a few weeks."
            other="Recall is drawn from # reviews, which is few enough that one bad evening moves it. It settles down after a few weeks."
          />
        </p>
      )}
    </Page>
  );
}

interface CardCountsProps {
  cards: InsightsOut["cards"];
}

/** The one figure on Insights that carries colour: the state colours every icon in the app uses. */
function CardSplit({ cards }: CardCountsProps) {
  const { t } = useLingui();
  const parts = (["new", "learning", "known"] as const).filter((k) => cards[k] > 0);
  return (
    <div
      className={clsx(
        "flex h-3 w-full gap-1",
        parts.length === 0 && "rounded-full border border-dashed border-edge-2",
      )}
      role="img"
      aria-label={t`${cards.new} new, ${cards.learning} learning, ${cards.known} known`}
    >
      {parts.map((k) => (
        <i
          key={k}
          className={clsx("block rounded-full", stateMarks[k].bg)}
          style={{ flexGrow: cards[k] }}
        />
      ))}
    </div>
  );
}

function CardChips({ cards }: CardCountsProps) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Chip size="sm">
        <StateIcon state="new" className="size-3" />
        <Trans>{cards.new} new</Trans>
      </Chip>
      <Chip size="sm">
        <StateIcon state="learning" className="size-3" />
        <Trans>{cards.learning} learning</Trans>
      </Chip>
      <Chip size="sm">
        <StateIcon state="known" className="size-3" />
        <Trans>{cards.known} known</Trans>
      </Chip>
    </span>
  );
}

interface ForecastBarsProps {
  forecast: InsightsOut["forecast"];
}

/**
 * Bars on a baseline, using the whole figure box. A track behind each one reads as a second
 * object stacked on the bar rather than as the space it could fill.
 *
 * Amber marks today, which is the day the learner can act on, rather than the heaviest day,
 * which the sentence under the chart already names. Today is also named in words and set in
 * ink, so it is never marked by colour alone.
 *
 * Every bar carries its count. Two cards and three cards are the same bar to the eye at this
 * height, and a tooltip is not an answer on a touch device.
 */
function ForecastBars({ forecast }: ForecastBarsProps) {
  const { t, i18n } = useLingui();
  const weekday = (date: string) => i18n.date(parseLocal(date), { weekday: "short" });
  const maxDue = Math.max(1, ...forecast.map((d) => d.count));
  /* The forecast starts at today by contract, so today is the first day, never a match. */
  const dayName = (date: string, i: number) => (i === 0 ? t`Today` : weekday(date));
  return (
    <div
      className="flex h-full w-full items-stretch gap-1.5"
      role="img"
      aria-label={forecast.map((d, i) => `${dayName(d.date, i)} ${d.count}`).join(", ")}
    >
      {forecast.map((d, i) => (
        <div key={d.date} className="flex flex-1 flex-col gap-1">
          <span
            className={clsx(
              "text-center text-2xs tabular-nums",
              i === 0 ? "font-medium text-text" : d.count > 0 ? "text-muted" : "text-faint",
            )}
          >
            {i18n.number(d.count)}
          </span>
          <div className="flex flex-1 items-end border-b border-edge">
            <i
              className={clsx("block w-full rounded-t-[4px]", i === 0 ? "bg-amber" : "bg-text/35")}
              style={{ height: d.count > 0 ? `max(3px, ${(d.count / maxDue) * 100}%)` : 0 }}
            />
          </div>
          <span
            className={clsx(
              "truncate text-center text-2xs",
              i === 0 ? "font-medium text-text" : "text-muted",
            )}
          >
            {i === 0 ? dayName(d.date, i) : weekday(d.date).slice(0, 2)}
          </span>
        </div>
      ))}
    </div>
  );
}
