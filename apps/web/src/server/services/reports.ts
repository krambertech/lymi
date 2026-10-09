import type {
  DeckReportDayOut,
  DeckReportMetricsOut,
  DeckReportOut,
  DeckReportSummaryOut,
  DeckReportsOut,
} from "@lymi/core";
import { and, desc, eq, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";
import { addDays, daysBetween } from "./days";

/**
 * Aggregate reports on the decks a publisher owns and has published, for the owner only. They
 * count learners and reviews and never name a learner or return one learner's history. ADR 0028.
 */

const DAY_MS = 86_400_000;
const ACTIVATION_WINDOW_MS = 7 * DAY_MS;
export const MAX_REPORT_DAYS = 366;

export type ReportPeriodInput =
  | { period?: "7d" | "30d" | undefined; from?: undefined; to?: undefined }
  | { period?: undefined; from: string; to: string };

interface Range {
  from: string;
  to: string;
  days: number;
  /** Epoch ms of `from`'s start and of the day after `to`. */
  start: number;
  end: number;
}

interface Periods {
  current: Range;
  previous: Range;
  incomplete: boolean;
}

function range(from: string, to: string): Range {
  return {
    from,
    to,
    days: daysBetween(from, to) + 1,
    start: Date.parse(`${from}T00:00:00Z`),
    end: Date.parse(`${to}T00:00:00Z`) + DAY_MS,
  };
}

function utcDay(at: number | Date): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** The asked-for period in UTC days and the equal-length period just before it. */
export function reportPeriods(input: ReportPeriodInput, now: Date): Periods {
  const today = utcDay(now);
  let from: string;
  let to: string;
  if (input.from !== undefined) {
    ({ from, to } = input);
    if (from > to) throw new ServiceError("invalid", "`from` must not be after `to`");
    if (to > today) throw new ServiceError("invalid", "`to` must not be after today (UTC)");
    if (daysBetween(from, to) + 1 > MAX_REPORT_DAYS) {
      throw new ServiceError("invalid", `A period can be at most ${MAX_REPORT_DAYS} days`);
    }
  } else {
    to = today;
    from = addDays(today, -((input.period === "7d" ? 7 : 30) - 1));
  }
  const current = range(from, to);
  const previousTo = addDays(from, -1);
  return {
    current,
    previous: range(addDays(previousTo, -(current.days - 1)), previousTo),
    incomplete: to === today,
  };
}

interface ReportedDeck {
  id: string;
  name: string;
  archivedAt: Date | null;
  slug: string;
  status: "published" | "withdrawn";
  publishedAt: Date;
  withdrawnAt: Date | null;
}

interface JoinRow {
  deck_id: string;
  member_id: string;
  via: string | null;
  at: number;
  first: number;
  first_review_at: number | null;
}

interface ReviewRow {
  deck_id: string;
  user_id: string;
  day: string;
  accepted: number;
  imported: number;
}

interface ViewRow {
  deck_id: string;
  day: string;
  views: number;
}

interface Facts {
  joins: JoinRow[];
  reviews: ReviewRow[];
  views: ViewRow[];
  members: Map<string, number>;
  pageViewsSince: string | null;
}

/** Every report for one owner, over the decks `owned` selects. */
async function facts(db: Db, owned: SQL, periods: Periods): Promise<Facts> {
  const { previous, current } = periods;
  const ownedCte = sql`with owned as (${owned})`;
  const [joins, reviews, views, members, since] = await Promise.all([
    // A join's audit row is the only record of an earlier add, since rejoining rewrites the membership.
    db.all<JoinRow>(sql`
      ${ownedCte},
      joins as (
        -- Audit times are whole seconds, so the row id breaks a tie between a leave and a quick rejoin.
        select a.entity_id as deck_id, json_extract(a.payload, '$.memberId') as member_id,
          json_extract(a.payload, '$.via') as via, a.created_at as at,
          row_number() over (
            partition by a.entity_id, json_extract(a.payload, '$.memberId')
            order by a.created_at, a.id
          ) = 1 as first
        from audit_log a
        join owned on owned.id = a.entity_id
        where a.user_id = owned.user_id and a.entity = 'deck' and a.action = 'join'
      )
      select j.deck_id, j.member_id, j.via, j.at, j.first,
        case when j.first then (
          select min(r.reviewed_at) from reviews r
          join cards c on c.id = r.card_id
          where r.user_id = j.member_id and c.deck_id = j.deck_id and r.reviewed_at >= j.at
            and r.source <> 'import'
            and not exists (select 1 from review_undos u where u.review_id = r.id)
        ) end as first_review_at
      from joins j
      where j.at >= ${previous.start} and j.at < ${current.end}
    `),
    db.all<ReviewRow>(sql`
      ${ownedCte}
      select c.deck_id, r.user_id, strftime('%Y-%m-%d', r.reviewed_at / 1000, 'unixepoch') as day,
        sum(case when r.source <> 'import' and u.review_id is null then 1 else 0 end) as accepted,
        sum(case when r.source = 'import' then 1 else 0 end) as imported
      from owned
      join cards c on c.deck_id = owned.id
      join reviews r on r.card_id = c.id
      left join review_undos u on u.review_id = r.id
      where r.user_id <> owned.user_id
        and r.reviewed_at >= ${previous.start} and r.reviewed_at < ${current.end}
      group by c.deck_id, r.user_id, day
    `),
    db.all<ViewRow>(sql`
      ${ownedCte}
      select v.deck_id, v.day, sum(v.views) as views
      from deck_page_views v
      join owned on owned.id = v.deck_id
      where v.day >= ${previous.from} and v.day <= ${current.to}
      group by v.deck_id, v.day
    `),
    db.all<{ deck_id: string; members: number }>(sql`
      ${ownedCte}
      select m.deck_id, count(*) as members
      from deck_members m
      join owned on owned.id = m.deck_id
      where m.removed_at is null
      group by m.deck_id
    `),
    db.all<{ since: string | null }>(sql`select min(day) as since from deck_page_views`),
  ]);
  return {
    joins,
    reviews,
    views,
    members: new Map(members.map((m) => [m.deck_id, m.members])),
    pageViewsSince: since[0]?.since ?? null,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function metrics(facts: Facts, deckId: string, r: Range, now: number): DeckReportMetricsOut {
  const joins = facts.joins.filter((j) => j.deck_id === deckId && j.at >= r.start && j.at < r.end);
  const firsts = joins.filter((j) => j.first);
  const activatedHours: number[] = [];
  let pending = 0;
  for (const j of firsts) {
    if (j.first_review_at !== null && j.first_review_at - j.at <= ACTIVATION_WINDOW_MS) {
      activatedHours.push((j.first_review_at - j.at) / 3_600_000);
    } else if (j.first_review_at === null && now - j.at < ACTIVATION_WINDOW_MS) {
      pending++;
    }
  }
  const decided = firsts.length - pending;

  const reviews = facts.reviews.filter(
    (v) => v.deck_id === deckId && v.day >= r.from && v.day <= r.to,
  );
  const daysByLearner = new Map<string, number>();
  let accepted = 0;
  let imported = 0;
  for (const row of reviews) {
    accepted += row.accepted;
    imported += row.imported;
    if (row.accepted > 0) daysByLearner.set(row.user_id, (daysByLearner.get(row.user_id) ?? 0) + 1);
  }

  const since = facts.pageViewsSince;
  const counting = since !== null && since <= r.to;
  const pageViews = counting
    ? facts.views
        .filter((v) => v.deck_id === deckId && v.day >= r.from && v.day <= r.to)
        .reduce((sum, v) => sum + v.views, 0)
    : null;

  return {
    adds: {
      events: joins.length,
      learners: new Set(joins.map((j) => j.member_id)).size,
      newLearners: firsts.length,
      rejoins: joins.length - firsts.length,
      viaPublication: joins.filter((j) => j.via === "publication").length,
      viaLink: joins.filter((j) => j.via === "link").length,
      viaUnknown: joins.filter((j) => j.via !== "publication" && j.via !== "link").length,
    },
    activation: {
      cohort: firsts.length,
      activated: activatedHours.length,
      pending,
      rate: decided > 0 ? activatedHours.length / decided : null,
      medianHoursToFirstReview: median(activatedHours),
    },
    use: {
      reviewers: daysByLearner.size,
      reviews: accepted,
      returning: [...daysByLearner.values()].filter((days) => days >= 2).length,
      importedReviews: imported,
    },
    discovery: {
      pageViews,
      pageViewsCoverage: !counting ? "none" : (since as string) > r.from ? "partial" : "full",
    },
  };
}

function summary(
  facts: Facts,
  deck: ReportedDeck,
  periods: Periods,
  now: number,
): DeckReportSummaryOut {
  return {
    deck: { id: deck.id, name: deck.name, archived: deck.archivedAt !== null },
    publication: {
      slug: deck.slug,
      status: deck.status,
      publishedAt: deck.publishedAt.toISOString(),
      withdrawnAt: deck.withdrawnAt?.toISOString() ?? null,
    },
    members: facts.members.get(deck.id) ?? 0,
    current: metrics(facts, deck.id, periods.current, now),
    previous: metrics(facts, deck.id, periods.previous, now),
  };
}

function days(facts: Facts, deckId: string, r: Range): DeckReportDayOut[] {
  const since = facts.pageViewsSince;
  const byDate = new Map<string, DeckReportDayOut>();
  for (let date = r.from; date <= r.to; date = addDays(date, 1)) {
    const counting = since !== null && date >= since;
    byDate.set(date, { date, adds: 0, reviewers: 0, reviews: 0, pageViews: counting ? 0 : null });
  }
  for (const j of facts.joins) {
    const day = j.deck_id === deckId ? byDate.get(utcDay(j.at)) : undefined;
    if (day) day.adds++;
  }
  for (const v of facts.reviews) {
    const day = v.deck_id === deckId && v.accepted > 0 ? byDate.get(v.day) : undefined;
    if (!day) continue;
    day.reviewers++;
    day.reviews += v.accepted;
  }
  for (const v of facts.views) {
    const day = v.deck_id === deckId ? byDate.get(v.day) : undefined;
    if (day && day.pageViews !== null) day.pageViews += v.views;
  }
  return [...byDate.values()];
}

/** The owner's decks with a publication row, published or withdrawn, archived or not. */
function reportedDecks(db: Db, ownerId: string, deckId?: string) {
  return db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      archivedAt: schema.decks.archivedAt,
      slug: schema.deckPublications.slug,
      status: schema.deckPublications.status,
      publishedAt: schema.deckPublications.publishedAt,
      withdrawnAt: schema.deckPublications.withdrawnAt,
    })
    .from(schema.decks)
    .innerJoin(schema.deckPublications, eq(schema.deckPublications.deckId, schema.decks.id))
    .where(
      and(
        eq(schema.decks.userId, ownerId),
        deckId === undefined ? undefined : eq(schema.decks.id, deckId),
      ),
    )
    .orderBy(desc(schema.deckPublications.publishedAt));
}

function ownedSql(ownerId: string, deckId?: string) {
  return sql`
    select decks.id, decks.user_id from decks
    join deck_publications p on p.deck_id = decks.id
    where decks.user_id = ${ownerId} ${deckId === undefined ? sql`` : sql`and decks.id = ${deckId}`}
  `;
}

function frame(periods: Periods, facts: Facts, now: Date) {
  return {
    period: { from: periods.current.from, to: periods.current.to, days: periods.current.days },
    previous: { from: periods.previous.from, to: periods.previous.to, days: periods.previous.days },
    incomplete: periods.incomplete,
    generatedAt: now.toISOString(),
    pageViewsSince: facts.pageViewsSince,
  };
}

/** Every deck the caller owns and has published, compared over one period. */
export async function deckReports(
  ctx: ServiceContext,
  input: ReportPeriodInput,
  now: Date = new Date(),
): Promise<DeckReportsOut> {
  const periods = reportPeriods(input, now);
  const decks = await reportedDecks(ctx.db, ctx.userId);
  const found = await facts(ctx.db, ownedSql(ctx.userId), periods);
  return {
    ...frame(periods, found, now),
    decks: decks.map((deck) => summary(found, deck, periods, now.getTime())),
  };
}

/**
 * One deck's report with a row per day. A deck the caller does not own, or never published, is
 * not found, so the answer says nothing about whether it exists.
 */
export async function deckReport(
  ctx: ServiceContext,
  deckId: string,
  input: ReportPeriodInput,
  now: Date = new Date(),
): Promise<DeckReportOut> {
  const periods = reportPeriods(input, now);
  const [deck] = await reportedDecks(ctx.db, ctx.userId, deckId);
  if (!deck) throw new ServiceError("not_found", "No report for this deck");
  const found = await facts(ctx.db, ownedSql(ctx.userId, deckId), periods);
  return {
    ...frame(periods, found, now),
    ...summary(found, deck, periods, now.getTime()),
    days: days(found, deck.id, periods.current),
  };
}
