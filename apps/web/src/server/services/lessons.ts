import type { LessonAccessOut, LessonEventOut, LessonReadOut, LinkRefusal } from "@lymi/core";
import {
  dayWindow,
  fitSource,
  LESSON_READ_WORDS,
  LESSON_READS_PER_DAY,
  newId,
  normalizeCardText,
  readingKey,
  sameReading,
  termKey,
} from "@lymi/core";
import { textCallCost } from "@lymi/core/analytics";
import { and, count, desc, eq, gt, inArray, isNull, sql } from "@lymi/core/db";
import type { z } from "zod";
import type { AiConsent } from "../ai/consent";
import type { Fetch } from "../ai/types";
import { schema } from "../db";
import { type DecisionModel, KEEP_THRESHOLD, keepScore } from "../lessons/keep";
import {
  classifyLink,
  countWords,
  type FetchedPage,
  fetchArticle,
  LinkInvalid,
  LinkRefused,
  LinkUnreadable,
  markdownSentences,
  youtubeTitle,
} from "../lessons/link";
import {
  ARTICLE_RULES,
  type DeckCandidate,
  decksBrief,
  questionLimit,
  Reply,
  replySchema,
  SEEN_LENGTH,
} from "../lessons/prompt";
import { holdsEveryWord, quoteAround } from "../lessons/quote";
import {
  type LessonMaterial,
  type LessonReader,
  LessonReaderError,
  type LessonUsage,
  type Transcript,
} from "../lessons/reader";
import { TermsStream } from "../lessons/terms-stream";
import { log } from "../log";
import { parseJson } from "../parse";
import { aiConsentFor, requireAi } from "./ai-consent";
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
  await requireAi(ctx);
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
  reads = 1,
): Promise<() => Promise<void>> {
  if (await isOperator(ctx, operators)) return async () => {};
  const day = await readDay(ctx);
  const ids = Array.from({ length: reads }, () => newId());
  const rows = sql.join(
    ids.map((id) => sql`select ${id} as id`),
    sql` union all `,
  );
  const result = await ctx.db.run(sql`
    insert into lesson_reads (id, user_id, local_date)
    select claimed.id, ${ctx.userId}, ${day.date} from (${rows}) as claimed
    where (
      select count(*) from lesson_reads where user_id = ${ctx.userId} and local_date = ${day.date}
    ) <= ${LESSON_READS_PER_DAY - reads}`);
  if ((result as D1Result).meta.changes !== reads) limitReached(ctx);
  return async () => {
    await ctx.db.delete(schema.lessonReads).where(inArray(schema.lessonReads.id, ids));
  };
}

export type LinkDeps = {
  request: Fetch;
  toMarkdown: (page: FetchedPage, consent: AiConsent) => Promise<string>;
};

const MAX_ARTICLE_CHARACTERS = 300_000;

const PERSONAL_PARAMETER =
  /^(utm_.*|fbclid|gclid|dclid|msclkid|mc_(cid|eid)|igshid|si|ref|ref_src|smid|sgrp|share.*|gift.*|unlocked_.*|access.*|.*token.*|sk|pwapi.*|_hs.*|mkt_tok)$/i;

export function cardSource(url: URL): string {
  const kept = new URL(url.href);
  kept.hash = "";
  for (const key of [...kept.searchParams.keys()])
    if (key !== "t" && PERSONAL_PARAMETER.test(key)) kept.searchParams.delete(key);
  return kept.href;
}

export function readsFor(words: number): number {
  return Math.max(1, Math.ceil(words / LESSON_READ_WORDS));
}

export async function readLink(
  ctx: ServiceContext,
  link: string,
  deps: LinkDeps,
  read: { client: "web" | "phone"; deck: "fixed" | "guessed" },
): Promise<Transcript> {
  const refuse = (refused: LinkRefusal, message: string, details: Record<string, string> = {}) => {
    track(ctx.analytics, {
      name: "lesson_read",
      client: read.client,
      material: "article",
      reads: 0,
      refused,
      pages: 0,
      pasted: false,
      deck: read.deck,
      terms: 0,
      ticked: 0,
      existing: 0,
      questions: 0,
    });
    return new ServiceError("invalid", message, { refused, ...details }, "link_refused");
  };
  const unreadable = (message: string) =>
    new ServiceError("invalid", message, undefined, "link_unreadable");

  let kind: ReturnType<typeof classifyLink>;
  try {
    kind = classifyLink(link);
  } catch (error) {
    if (error instanceof LinkInvalid)
      throw new ServiceError("invalid", error.message, undefined, "link_invalid");
    throw error;
  }
  if (kind.kind === "drm") {
    throw refuse(
      "drm",
      `${kind.service} doesn't let apps read what it plays. Paste the text instead.`,
      { service: kind.service },
    );
  }
  if (kind.kind === "youtube") {
    const title = await youtubeTitle(kind.url, deps.request);
    throw refuse(
      "youtube",
      "YouTube doesn't let apps read its captions. Paste the video's transcript instead.",
      title ? { title } : {},
    );
  }

  let page: FetchedPage;
  try {
    page = await fetchArticle(kind.url, deps.request);
  } catch (error) {
    if (error instanceof LinkRefused) throw refuse(error.refused, error.message);
    if (error instanceof LinkUnreadable) throw unreadable(error.message);
    throw error;
  }
  const consent = await requireAi(ctx);
  let markdown: string;
  try {
    markdown = await deps.toMarkdown(page, consent);
  } catch (error) {
    if (error instanceof LinkUnreadable)
      throw unreadable("Smart add couldn't read this page. Paste the text instead.");
    console.error("Converting a page failed", {
      error: error instanceof Error ? error.name : typeof error,
    });
    throw new ServiceError("unavailable", "Smart add couldn't read pages just now. Try again.");
  }
  const sentences = markdownSentences(markdown);
  if (sentences.length === 0) throw unreadable("This page has no text Smart add can read.");
  return {
    title: page.title,
    url: fitSource(cardSource(page.url)) ?? page.url.origin,
    sentences: sentences.map((text) => ({ text, at: null })),
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
  if (material.transcript) return `Material: an article of ${words} words.\n${ARTICLE_RULES}`;
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
  consent: AiConsent;
  consentNow: () => Promise<AiConsent | null>;
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
  transcript: Transcript | undefined;
  reads: number;
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
): Promise<{ reader: LessonReader; consent: AiConsent }> {
  if (!deps.reader) throw new ServiceError("unavailable", "Reading lessons is not configured.");
  const consent = await requireAi(ctx);
  const { daily } = await lessonAccess(ctx, deps.operators);
  if (daily && daily.used >= daily.limit) limitReached(ctx);
  return { reader: deps.reader, consent };
}

export async function prepareLesson(
  ctx: ServiceContext,
  material: LessonMaterial,
  deps: LessonDeps,
  choice: {
    deckId?: string | undefined;
    hint?: string | undefined;
    client?: "web" | "phone";
    reads?: number | undefined;
  } = {},
): Promise<PreparedLesson> {
  const { reader, consent } = await assertCanReadLessons(ctx, deps);
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
  const words = material.transcript
    ? countWords(material.transcript.sentences.map((s) => s.text).join(" "))
    : material.text.trim()
      ? material.text.trim().split(/\s+/).length
      : 0;
  const reads = material.transcript ? readsFor(words) : 1;
  const characters = material.transcript?.sentences.reduce((n, s) => n + s.text.length + 8, 0) ?? 0;
  if (reads > LESSON_READS_PER_DAY || characters > MAX_ARTICLE_CHARACTERS) {
    throw new ServiceError(
      "invalid",
      "This article is too long for Smart add. Paste the part you want to learn from.",
      undefined,
      "too_long",
    );
  }
  if (reads > 1 && choice.reads !== reads) {
    const { daily } = await lessonAccess(ctx, deps.operators);
    throw new ServiceError(
      "conflict",
      `This article is about ${words} words, so it counts as ${reads} reads.`,
      {
        reads: String(reads),
        words: String(words),
        ...(daily ? { left: String(Math.max(0, daily.limit - daily.used)) } : {}),
      },
      "long_read",
    );
  }
  // Last, so a read refused above never counts.
  const release = await claimRead(ctx, deps.operators, reads);
  return {
    release,
    reader,
    consent,
    consentNow: () => aiConsentFor(ctx),
    pages,
    brief: `${decksBrief(decks, {
      fixed: !!fixed,
      hint,
      meaningLanguage: settings.meaningLanguage,
      limit: questionLimit(pages, words),
    })}\n${materialLine(material, words)}`,
    schema: replySchema(
      candidates.map((d) => d.id),
      { article: !!material.transcript },
    ),
    decks: new Map(candidates.map((d) => [d.id, d.name])),
    fixed: fixed?.id,
    fallback: fixed?.id ?? hint ?? candidates[0]?.id ?? "",
    deckRule:
      "One card per term; inflected forms, imperatives and request formulas belong to their word's card",
    byKey: ownedByKey(owned),
    byHead: new Map(owned.map((c) => [headForm(c.key), ownedCard(c)])),
    languages: new Map(candidates.map((d) => [d.id, d.language])),
    transcript: material.transcript,
    reads,
    analytics: ctx.analytics,
    pasted: !material.transcript && words > 0,
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

function exampleOf(
  transcript: Transcript | undefined,
  term: { term: string; seen: string; sentence?: number | undefined },
): { example: string | null; at: number | null } {
  if (!transcript) return { example: null, at: null };
  const { sentences } = transcript;
  const headWords = countWords(term.term.split(" · ")[0] ?? "");
  const says = (s: { text: string }) => countWords(s.text) > headWords;
  const holds = (s: { text: string }) => says(s) && holdsEveryWord(s.text, term.term);
  const quoted = (s: { text: string }) =>
    says(s) && s.text.slice(0, SEEN_LENGTH).trim() === term.seen;
  const numbered = term.sentence ? sentences[term.sentence - 1] : undefined;
  const sentence =
    sentences.find(quoted) ??
    (numbered && holds(numbered) ? numbered : undefined) ??
    sentences.find(holds);
  if (!sentence) return { example: null, at: null };
  return { example: quoteAround(sentence.text, term.term), at: sentence.at };
}

/** The fewest terms one answer must untick for its question to beat unticking them on the list. */
const QUESTION_DROPS = 2;

/** Whether some answer unticks a few of the new terms and none unticks them all, leaving nothing to add. */
export function worthAsking(options: { drop: string[] }[], fresh: number): boolean {
  const drops = options.map((o) => new Set(o.drop).size);
  return drops.some((n) => n >= QUESTION_DROPS) && drops.every((n) => n < fresh);
}

async function scoreTerm(
  lesson: PreparedLesson,
  ai: DecisionModel,
  candidate: Parameters<typeof keepScore>[2],
): Promise<number | null> {
  if (!ai) return null;
  const consent = await lesson.consentNow().catch((error: unknown) => {
    log.warn("lesson_consent_unread", { error });
    return null;
  });
  return consent && keepScore(ai, lesson.deckRule, candidate, consent);
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
    const key = termKey(language, t.term);
    const reading = readingKey({ term: t.term, language, pronunciation: t.pronunciation });
    if (seen.has(`${key}\u0000${reading ?? ""}`)) return;
    seen.add(`${key}\u0000${reading ?? ""}`);
    const scored = scoreTerm(lesson, ai, {
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
        ...exampleOf(lesson.transcript, t),
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
  if (lesson.transcript)
    emit({ type: "source", title: lesson.transcript.title, url: lesson.transcript.url });

  const report = textCallReporter(lesson.analytics, "lesson_read");
  const started = Date.now();
  let usage: LessonUsage;
  try {
    usage = await lesson.reader.stream(
      material,
      lesson.brief,
      lesson.schema,
      (text) => {
        if (!deck) {
          const chosen = /"deck"\s*:\s*"([^"]+)"/.exec(stream.all + text)?.[1];
          if (chosen && lesson.decks.has(chosen)) announce(chosen);
        }
        for (const raw of stream.push(text)) take(raw);
      },
      lesson.consent,
    );
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

  // A reply that broke off after its terms still leaves a usable list.
  const parsed = Reply.safeParse(parseJson(stream.all));
  const reply: Reply | null = parsed.success ? parsed.data : null;
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
    material: lesson.transcript ? "article" : "lesson",
    reads: lesson.reads,
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
