import type { LessonAccessOut, LessonEventOut, LessonReadOut } from "@lymi/core";
import {
  dayWindow,
  LESSON_READS_PER_DAY,
  newId,
  normaliseTerm,
  normalizeCardText,
  readingKey,
  sameReading,
} from "@lymi/core";
import { textCallCost } from "@lymi/core/analytics";
import { and, count, desc, eq, gt, isNull, sql } from "@lymi/core/db";
import type { z } from "zod";
import { schema } from "../db";
import { type DecisionModel, KEEP_THRESHOLD, keepScore } from "../lessons/keep";
import {
  type DeckCandidate,
  decksBrief,
  questionLimit,
  Reply,
  replySchema,
} from "../lessons/prompt";
import {
  type LessonMaterial,
  type LessonReader,
  LessonReaderError,
  type LessonUsage,
} from "../lessons/reader";
import { TermsStream } from "../lessons/terms-stream";
import { type AnalyticsWriter, textCallReporter, track } from "./analytics";
import type { ServiceContext } from "./context";
import { notFound, ServiceError } from "./context";
import { getSettings } from "./settings";

type LessonRead = z.infer<typeof LessonReadOut>;
export type LessonEvent = z.infer<typeof LessonEventOut>;
type LessonTerm = LessonRead["terms"][number];

async function isOperator(ctx: ServiceContext, operators: Set<string>): Promise<boolean> {
  const [user] = await ctx.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  return Boolean(user && operators.has(user.email.toLowerCase()));
}

/** The learner's own day, as the feedback cap and the daily goal count it. */
async function readDay(ctx: ServiceContext) {
  return dayWindow(new Date(), (await getSettings(ctx)).reviewTimezone ?? "UTC");
}

async function readsOn(ctx: ServiceContext, localDate: string): Promise<number> {
  const [row] = await ctx.db
    .select({ n: count() })
    .from(schema.lessonReads)
    .where(
      and(eq(schema.lessonReads.userId, ctx.userId), eq(schema.lessonReads.localDate, localDate)),
    );
  return row?.n ?? 0;
}

/**
 * Smart add is a beta every learner may use, up to `LESSON_READS_PER_DAY` reads in their own day,
 * because each read runs on Lymi's model. Operators have no limit.
 */
export async function lessonAccess(
  ctx: ServiceContext,
  operators: Set<string>,
): Promise<LessonAccessOut> {
  if (await isOperator(ctx, operators)) return { allowed: true, daily: null };
  const day = await readDay(ctx);
  const used = Math.min(await readsOn(ctx, day.date), LESSON_READS_PER_DAY);
  return {
    allowed: true,
    daily: { limit: LESSON_READS_PER_DAY, used, resetsAt: day.end.toISOString() },
  };
}

/** How long after a read its questions may still be checked against the learner's own answer. */
const ANSWER_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Checking a learner's own answer runs Workers AI per term, so it is open only to an operator or
 * to a learner whose last counted read is recent; it adds nothing to the daily count.
 */
export async function assertCanCheckAnswers(
  ctx: ServiceContext,
  operators: Set<string>,
): Promise<void> {
  if (await isOperator(ctx, operators)) return;
  const [recent] = await ctx.db
    .select({ id: schema.lessonReads.id })
    .from(schema.lessonReads)
    .where(
      and(
        eq(schema.lessonReads.userId, ctx.userId),
        gt(schema.lessonReads.createdAt, new Date(Date.now() - ANSWER_WINDOW_MS)),
      ),
    )
    .limit(1);
  if (!recent) {
    throw new ServiceError(
      "forbidden",
      "Read a lesson first; its answers can be checked for two hours.",
      undefined,
      "no_recent_read",
    );
  }
}

function limitReached(ctx: ServiceContext): never {
  track(ctx.analytics, { name: "lesson_read_limited" });
  throw new ServiceError(
    "conflict",
    `Smart add reads up to ${LESSON_READS_PER_DAY} lessons a day. Try again tomorrow.`,
    undefined,
    "daily_limit",
  );
}

/**
 * Counts a read against today's limit just before the model starts; the release undoes it. The
 * insert carries its own count, so two reads started together cannot both take the last one.
 */
async function claimRead(
  ctx: ServiceContext,
  operators: Set<string>,
): Promise<() => Promise<void>> {
  if (await isOperator(ctx, operators)) return async () => {};
  const day = await readDay(ctx);
  const id = newId();
  const result = await ctx.db.run(sql`
    insert into lesson_reads (id, user_id, local_date)
    select ${id}, ${ctx.userId}, ${day.date}
    where (
      select count(*) from lesson_reads where user_id = ${ctx.userId} and local_date = ${day.date}
    ) < ${LESSON_READS_PER_DAY}`);
  if ((result as D1Result).meta.changes !== 1) limitReached(ctx);
  return async () => {
    await ctx.db.delete(schema.lessonReads).where(eq(schema.lessonReads.id, id));
  };
}

export type LessonDeps = {
  reader: LessonReader | null;
  ai: DecisionModel;
  operators: Set<string>;
};

/** Pages in a PDF, counted from its page objects; a guess good enough for the lesson count. */
export function pdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return Math.max(1, (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length);
}

/** What the model was given, so it never asks about marks on material that cannot carry any. */
function materialLine(material: LessonMaterial, words: number): string {
  const parts = [
    material.images.length > 0 ? `${material.images.length} photo(s)` : "",
    material.pdfs.length > 0 ? `${material.pdfs.length} PDF(s)` : "",
    words > 0 ? `pasted text of ${words} words` : "",
  ].filter(Boolean);
  return `Material: ${parts.join(", ")}.`;
}

/** The first of a term's forms, so "küsima" and "küsima · küsida · küsin" meet. */
const headForm = (key: string) => key.split(" · ")[0]?.trim() ?? key;

type OwnedRow = Omit<Owned, "reading"> & { language: string | null; pronunciation: string | null };

function ownedCard({ language, pronunciation, ...card }: OwnedRow): Owned {
  return { ...card, reading: readingKey({ term: card.term, language, pronunciation }) };
}

function ownedByKey(rows: OwnedRow[]): Map<string, Owned[]> {
  const byKey = new Map<string, Owned[]>();
  for (const row of rows) byKey.set(row.key, [...(byKey.get(row.key) ?? []), ownedCard(row)]);
  return byKey;
}

const ReplyTerm = Reply.shape.terms.element;

type Owned = { id: string; term: string; key: string; reading: string | null; deckName: string };

/** Everything a read needs before the model starts, checked first so a refusal is an ordinary error. */
export type PreparedLesson = {
  reader: LessonReader;
  brief: string;
  schema: Record<string, unknown>;
  decks: Map<string, string>;
  /** The deck the learner opened Smart add from; otherwise the model chooses. */
  fixed: string | undefined;
  fallback: string;
  pages: number;
  deckRule: string;
  /** Homographs told apart by their readings share a key, so a key can hold several cards. */
  byKey: Map<string, Owned[]>;
  byHead: Map<string, Owned>;
  /** Each candidate deck's language, which decides whether a term's reading counts. */
  languages: Map<string, string | null>;
  analytics: AnalyticsWriter | undefined;
  pasted: boolean;
  client: "web" | "phone";
  /** Takes the read back off today's count, for a read that failed. */
  release: () => Promise<void>;
};

/** How many of the learner's decks the model chooses among, most recently changed first. */
const DECK_CHOICES = 12;

/** Refuses a read before any upload is processed, so a refused account costs nothing. */
export async function assertCanReadLessons(
  ctx: ServiceContext,
  deps: Pick<LessonDeps, "reader" | "operators">,
): Promise<LessonReader> {
  if (!deps.reader) throw new ServiceError("unavailable", "Reading lessons is not configured.");
  const { daily } = await lessonAccess(ctx, deps.operators);
  if (daily && daily.used >= daily.limit) limitReached(ctx);
  return deps.reader;
}

export async function prepareLesson(
  ctx: ServiceContext,
  material: LessonMaterial,
  deps: LessonDeps,
  choice: {
    deckId?: string | undefined;
    hint?: string | undefined;
    client?: "web" | "phone";
  } = {},
): Promise<PreparedLesson> {
  const reader = await assertCanReadLessons(ctx, deps);
  const { db, userId } = ctx;

  const ownDecks = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      language: schema.decks.defaultLanguage,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), isNull(schema.decks.archivedAt)))
    .orderBy(desc(schema.decks.updatedAt))
    .limit(choice.deckId ? 500 : DECK_CHOICES);
  const fixed = choice.deckId ? ownDecks.find((d) => d.id === choice.deckId) : undefined;
  if (choice.deckId && !fixed) throw notFound("Deck");
  const candidates = fixed ? [fixed] : ownDecks;
  if (candidates.length === 0) throw new ServiceError("invalid", "Create a deck first.");

  const [examples, settings, owned] = await Promise.all([
    Promise.all(
      candidates.map((deck) =>
        db
          .select({ term: schema.cards.term, meaning: schema.cards.meaning })
          .from(schema.cards)
          .where(and(eq(schema.cards.deckId, deck.id), isNull(schema.cards.archivedAt)))
          .orderBy(desc(schema.cards.createdAt))
          .limit(fixed ? 10 : 5),
      ),
    ),
    getSettings(ctx),
    // Every active card of the learner's, keyed by its whole term and by its first form.
    db
      .select({
        id: schema.cards.id,
        term: schema.cards.term,
        key: schema.cards.normalizedTerm,
        language: schema.cards.language,
        pronunciation: schema.cards.pronunciation,
        deckName: schema.decks.name,
      })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(eq(schema.cards.userId, userId), isNull(schema.cards.archivedAt))),
  ]);
  const decks: DeckCandidate[] = candidates.map((deck, i) => ({
    ...deck,
    examples: examples[i] ?? [],
  }));
  const hint = candidates.find((d) => d.id === choice.hint)?.id;

  const pages = material.images.length + material.pdfs.reduce((sum, pdf) => sum + pdfPages(pdf), 0);
  const words = material.text.trim() ? material.text.trim().split(/\s+/).length : 0;
  // Last, so a read refused above never counts.
  const release = await claimRead(ctx, deps.operators);
  return {
    release,
    reader,
    pages,
    brief: `${decksBrief(decks, {
      fixed: !!fixed,
      hint,
      meaningLanguage: settings.meaningLanguage,
      limit: questionLimit(pages, words),
    })}\n${materialLine(material, words)}`,
    schema: replySchema(candidates.map((d) => d.id)),
    decks: new Map(candidates.map((d) => [d.id, d.name])),
    fixed: fixed?.id,
    fallback: fixed?.id ?? hint ?? candidates[0]?.id ?? "",
    deckRule:
      "One card per term; inflected forms, imperatives and request formulas belong to their word's card",
    byKey: ownedByKey(owned),
    byHead: new Map(owned.map((c) => [headForm(c.key), ownedCard(c)])),
    languages: new Map(candidates.map((d) => [d.id, d.language])),
    analytics: ctx.analytics,
    pasted: words > 0,
    client: choice.client ?? "web",
  };
}

/**
 * Read the lesson and send each term the moment the model finishes writing it, then the questions,
 * then the cost. Nothing is stored: the learner adds what they keep through the ordinary add path.
 * A read that fails is taken off the learner's daily count.
 */
export async function streamLesson(
  lesson: PreparedLesson,
  material: LessonMaterial,
  ai: DecisionModel,
  emit: (event: LessonEvent) => void,
): Promise<void> {
  try {
    await readInto(lesson, material, ai, emit);
  } catch (error) {
    await lesson.release();
    throw error;
  }
}

/** The fewest terms one answer must untick for its question to beat unticking them on the list. */
const QUESTION_DROPS = 2;

/** Whether some answer unticks a few of the new terms and none unticks them all, leaving nothing to add. */
export function worthAsking(options: { drop: string[] }[], fresh: number): boolean {
  const drops = options.map((o) => new Set(o.drop).size);
  return drops.some((n) => n >= QUESTION_DROPS) && drops.every((n) => n < fresh);
}

async function readInto(
  lesson: PreparedLesson,
  material: LessonMaterial,
  ai: DecisionModel,
  emit: (event: LessonEvent) => void,
): Promise<void> {
  const stream = new TermsStream();
  const seen = new Set<string>();
  const ids = new Set<string>();
  /** Terms not already among the learner's cards: the ones a question's answer can untick. */
  const fresh = new Set<string>();
  let ticked = 0;
  let existing = 0;
  // Each term waits for its own score and for the term before it, so the list keeps the page's order.
  let queue = Promise.resolve();

  const take = (raw: unknown) => {
    const parsed = ReplyTerm.safeParse(raw);
    if (!parsed.success) return;
    const language = lesson.languages.get(deck ?? lesson.fallback) ?? null;
    const t = { ...parsed.data, ...normalizeCardText(language, parsed.data).fields };
    const key = normaliseTerm(t.term);
    const reading = readingKey({ term: t.term, language, pronunciation: t.pronunciation });
    if (seen.has(`${key}\u0000${reading ?? ""}`)) return;
    seen.add(`${key}\u0000${reading ?? ""}`);
    const scored = keepScore(ai, lesson.deckRule, {
      id: t.id,
      term: t.term,
      meaning: t.meaning,
      kind: t.kind,
    });
    queue = queue.then(async () => {
      const keep = await scored;
      const sameKey = lesson.byKey.get(key);
      const exact = sameKey?.find((c) => sameReading(c.reading, reading));
      // A homograph with another reading is a different word, not another form of this one.
      const head = sameKey ? undefined : lesson.byHead.get(headForm(key));
      const match = (c: Owned | undefined) =>
        c ? { cardId: c.id, term: c.term, deckName: c.deckName } : null;
      const term: LessonTerm = {
        id: t.id,
        term: t.term,
        kind: t.kind,
        meaning: t.meaningFromLesson && t.meaning ? t.meaning : null,
        gloss: t.meaning,
        pronunciation: t.pronunciation || null,
        handwritten: t.handwritten,
        heading: t.heading || null,
        seen: t.seen,
        keep,
        ticked: !exact && !head && (keep === null || keep >= KEEP_THRESHOLD),
        existing: match(exact),
        formOf: match(head),
      };
      ids.add(t.id);
      if (!exact) fresh.add(t.id);
      if (term.ticked) ticked++;
      if (exact || head) existing++;
      emit({ type: "term", term });
    });
  };

  let deck: string | undefined;
  const announce = (id: string) => {
    deck = id;
    emit({
      type: "deck",
      deckId: id,
      deckName: lesson.decks.get(id) ?? "",
      guessed: !lesson.fixed,
    });
  };
  if (lesson.fixed) announce(lesson.fixed);

  const report = textCallReporter(lesson.analytics, "lesson_read");
  const started = Date.now();
  let usage: LessonUsage;
  try {
    usage = await lesson.reader.stream(material, lesson.brief, lesson.schema, (text) => {
      if (!deck) {
        const chosen = /"deck"\s*:\s*"([^"]+)"/.exec(stream.all + text)?.[1];
        if (chosen && lesson.decks.has(chosen)) announce(chosen);
      }
      for (const raw of stream.push(text)) take(raw);
    });
  } catch (error) {
    report({
      provider: "anthropic",
      model: lesson.reader.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - started,
      error: true,
      status: error instanceof LessonReaderError ? error.status : undefined,
    });
    throw error;
  }
  report({
    provider: "anthropic",
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latencyMs: usage.ms,
    error: false,
  });
  if (!deck) announce(lesson.fallback);
  await queue;

  let reply: Reply | null = null;
  try {
    const parsed = Reply.safeParse(JSON.parse(stream.all));
    if (parsed.success) reply = parsed.data;
  } catch {
    // A reply that broke off after its terms still leaves a usable list.
  }
  if (!reply && ids.size === 0)
    throw new ServiceError("unavailable", "The lesson could not be read. Try again.");

  const questions = (reply?.questions ?? [])
    .map((q) => ({
      ...q,
      options: q.options.map((o) => ({ label: o.label, drop: o.drop.filter((id) => ids.has(id)) })),
    }))
    .filter((q) =>
      worthAsking(
        q.options.map((o) => ({ drop: o.drop.filter((id) => fresh.has(id)) })),
        fresh.size,
      ),
    )
    .slice(0, 2);
  emit({
    type: "questions",
    questions: questions.map((q, i) => ({
      id: `q${i + 1}`,
      question: q.question,
      options: q.options,
      default: Math.min(q.default, q.options.length - 1),
    })),
  });

  const cost = textCallCost(usage.model, { input: usage.inputTokens, output: usage.outputTokens });
  track(lesson.analytics, {
    name: "lesson_read",
    client: lesson.client,
    pages: lesson.pages,
    pasted: lesson.pasted,
    deck: lesson.fixed ? "fixed" : "guessed",
    terms: ids.size,
    ticked,
    existing,
    questions: questions.length,
  });
  emit({
    type: "done",
    pages: lesson.pages,
    usage: {
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: cost ? cost.input + cost.output : 0,
      ms: usage.ms,
    },
  });
}

/** The whole read at once, for callers that do not stream. */
export async function readLesson(
  ctx: ServiceContext,
  material: LessonMaterial,
  deps: LessonDeps,
  choice: Parameters<typeof prepareLesson>[3] = {},
): Promise<LessonRead> {
  const lesson = await prepareLesson(ctx, material, deps, choice);
  const read: LessonRead = {
    terms: [],
    questions: [],
    pages: lesson.pages,
    usage: { model: "", inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0 },
  };
  await streamLesson(lesson, material, deps.ai, (event) => {
    if (event.type === "term") read.terms.push(event.term);
    if (event.type === "questions") read.questions = event.questions;
    if (event.type === "done") read.usage = event.usage;
  });
  return read;
}
