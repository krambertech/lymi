import type { InsightsOut } from "@lymi/core";
import { clsx } from "clsx";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { MonthBars } from "../components/MonthBars";
import { RunStrip } from "../components/RunStrip";
import { Segmented } from "../components/Segmented";
import { Skeleton } from "../components/Skeleton";
import { StatPlate } from "../components/StatPlate";
import { TrendLine } from "../components/TrendLine";
import { Page, PageHeader } from "./Shell";

export type Period = "30" | "90" | "0";

export interface InsightsProps {
  data: InsightsOut | undefined;
  period: Period;
  onPeriod: (p: Period) => void;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const MONTH = new Intl.DateTimeFormat(undefined, { month: "long" });
const SHORT = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** Parses a local YYYY-MM-DD without letting the timezone shift it a day. */
function parseLocal(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "0", label: "All" },
];

/**
 * The one screen where charts belong, and the only one where looking at them is a choice.
 * Four numbers, each with the sentence that makes it mean something, then the months, then
 * the cards that keep coming back.
 *
 * Every figure draws in ink except the lights, which stay amber because they are the
 * streak's lights. A chart series in amber would make this the one screen where the accent
 * means "data" rather than "act".
 */
export function InsightsView({ data, period, onPeriod }: InsightsProps) {
  const switcher = (
    <Segmented
      size="sm"
      label="How far back the recall figure looks"
      value={period}
      onChange={onPeriod}
      options={PERIODS}
    />
  );

  if (!data) {
    return (
      <Page>
        <PageHeader title="Insights" actions={switcher} />
        {/* Same heights the plates settle at, so the screen does not jump when they land. */}
        <div className="grid gap-3 @3xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[223px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-3 h-[105px] rounded-xl" />
      </Page>
    );
  }

  const { recall, consistency, months, cards, forecast, leeches } = data;
  const nothingYet = consistency.daysAllTime === 0 && cards.total === 0;

  if (nothingYet) {
    return (
      <Page>
        <PageHeader title="Insights" />
        <EmptyState
          lantern="unlit"
          title="Nothing to say yet"
          body="Reviews per day, how much is sticking, and the words that keep coming back. This fills in once there is some history behind you."
          className="flex-1"
        />
      </Page>
    );
  }

  const graded = recall.passed + recall.failed;
  const monthly = period === "0";
  const trend = recall.series.map((p) => ({
    at: p.at,
    value: p.rate,
    label: monthly
      ? MONTH.format(parseLocal(`${p.at}-01`))
      : `week of ${SHORT.format(parseLocal(p.at))}`,
  }));
  const peak = forecast.reduce(
    (a, b) => (b.count > a.count ? b : a),
    forecast[0] ?? {
      date: "",
      count: 0,
    },
  );
  const dueSoon = forecast.reduce((n, d) => n + d.count, 0);
  const maxDue = Math.max(1, ...forecast.map((d) => d.count));

  return (
    <Page>
      <PageHeader
        title="Insights"
        sub={
          consistency.daysAllTime > 0
            ? `${plural(consistency.daysAllTime, "day", "days")} since your first review`
            : undefined
        }
        actions={switcher}
      />

      <div className="grid gap-3 @3xl:grid-cols-2">
        <StatPlate
          label="Recall"
          value={recall.rate === null ? "—" : `${Math.round(recall.rate * 100)}%`}
          figure={
            trend.length > 0 ? (
              <TrendLine
                points={trend}
                target={0.9}
                targetLabel="90%"
                label={`Recall by ${monthly ? "month" : "week"}: ${trend
                  .map((p) => `${p.label} ${Math.round(p.value * 100)}%`)
                  .join(", ")}. The schedule aims for 90%.`}
              />
            ) : undefined
          }
          note={
            recall.rate === null
              ? "Nothing has come back for a second look yet, so there is nothing honest to report."
              : `${recall.passed} remembered, ${recall.failed} forgotten.`
          }
        />

        <StatPlate
          label="Consistency"
          value={consistency.lit}
          unit={`/ ${consistency.days.length} days`}
          figure={<RunStrip days={consistency.days} />}
          note={
            consistency.days.length === 0
              ? "No reviews yet. Each block here will be a day."
              : consistency.longestRun > 1
                ? `Longest run ${plural(consistency.longestRun, "day", "days")}. Unbroken stretches join up.`
                : "Each block is a day. They join up when you keep going."
          }
        />

        <StatPlate
          label="Collection"
          value={cards.total}
          unit="cards"
          figure={
            // The one figure here that carries colour, and it borrows rather than invents:
            // amber for New, green for Known, a plain edge for Learning, which is exactly how
            // `StateChip` marks the same three states everywhere else in the app.
            <div
              className="flex h-3 w-full gap-1"
              role="img"
              aria-label={`${cards.new} new, ${cards.learning} learning, ${cards.known} known`}
            >
              {cards.new > 0 && (
                <i className="block rounded-full bg-amber" style={{ flexGrow: cards.new }} />
              )}
              {cards.learning > 0 && (
                // Ink rather than `plate-2`: a well-coloured segment between two saturated
                // ones reads as a gap in the bar instead of a third state.
                <i className="block rounded-full bg-text/30" style={{ flexGrow: cards.learning }} />
              )}
              {cards.known > 0 && (
                <i className="block rounded-full bg-good" style={{ flexGrow: cards.known }} />
              )}
            </div>
          }
          note={
            <span className="flex flex-wrap gap-1.5">
              <Chip size="sm" dot tone="new">
                {cards.new} new
              </Chip>
              <Chip size="sm" dot tone="learning">
                {cards.learning} learning
              </Chip>
              <Chip size="sm" dot tone="known">
                {cards.known} known
              </Chip>
            </span>
          }
        />

        <StatPlate
          label="Ahead"
          value={peak.count}
          unit={peak.count > 0 ? `peak, ${WEEKDAY.format(parseLocal(peak.date))}` : "due this week"}
          figure={
            // Bars on a baseline, using the whole figure box. A track behind each one reads
            // as a second object stacked on the bar rather than as the space it could fill.
            <div
              className="flex h-full w-full items-stretch gap-1.5"
              role="img"
              aria-label={forecastLabel(forecast)}
            >
              {forecast.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-1 items-end border-b border-edge">
                    <i
                      className={clsx(
                        "block w-full rounded-t-[4px]",
                        d.count === peak.count && peak.count > 0 ? "bg-amber" : "bg-text/35",
                      )}
                      style={{ height: d.count > 0 ? `max(3px, ${(d.count / maxDue) * 100}%)` : 0 }}
                    />
                  </div>
                  <span className="text-center text-2xs text-muted tabular-nums">
                    {WEEKDAY.format(parseLocal(d.date)).slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          }
          note={`${plural(dueSoon, "card", "cards")} over the next seven days.`}
        />
      </div>

      {months.length > 0 && (
        <section className="edge mt-3 flex flex-col gap-4 rounded-xl bg-plate p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">
              Month by month
            </h2>
            <span className="text-xs text-muted tabular-nums">
              {consistency.litAllTime} of {consistency.daysAllTime} days
            </span>
          </div>
          <MonthBars months={months} />
        </section>
      )}

      {leeches.cards.length > 0 && (
        <section className="edge mt-3 overflow-hidden rounded-xl bg-plate">
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-3">
            <h2 className="text-2xs font-medium uppercase tracking-[0.06em] text-muted">
              Keeps coming back
            </h2>
            <span className="text-xs text-muted">Forgotten {leeches.lapses}+ times</span>
          </div>
          <ul>
            {leeches.cards.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 border-t border-edge px-5 py-3"
              >
                <span className="min-w-0">
                  <span className="font-medium text-text" lang={c.language ?? undefined}>
                    {c.term}
                  </span>
                  {c.meaning && <span className="ml-2 text-sm text-muted">{c.meaning}</span>}
                </span>
                <span className="shrink-0 text-sm text-muted tabular-nums">
                  {c.lapses} of {c.reviews}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {graded > 0 && graded < 30 && (
        <p className="mt-5 px-1 text-sm text-muted">
          Recall is drawn from {plural(graded, "review", "reviews")}, which is few enough that one
          bad evening moves it. It settles down after a few weeks.
        </p>
      )}
    </Page>
  );
}

function forecastLabel(forecast: InsightsOut["forecast"]): string {
  return forecast.map((d) => `${WEEKDAY.format(parseLocal(d.date))} ${d.count}`).join(", ");
}
