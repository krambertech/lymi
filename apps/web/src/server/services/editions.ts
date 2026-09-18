import type {
  EditionApprovalInput,
  EditionCardField,
  EditionImportInput,
  EditionOut,
  EditionsOut,
  LocalizationProvenance,
} from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, inArray, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { auditStatement } from "./audit";
import { runBatch, runInBatches, type Statement, selectIn } from "./batch";
import { type ServiceContext, ServiceError } from "./context";
import { ownedDeck } from "./members";
import { assertPublisher } from "./publishers";
import { activeCardsOf, activeSectionsOf } from "./revisions";

/** The deck fields an edition must carry: what Library shows and what the public page shows. */
const DECK_FIELDS = ["name", "summary"] as const;

/** Where one unit of an edition stands. `ready` is approved text written from the current revision. */
type UnitState = "missing" | "stale" | "ready";

export interface EditionReport {
  language: string;
  /** The deck, plus every active section and active card. */
  total: number;
  ready: number;
  stale: number;
  missing: number;
  /** Why the edition cannot be published, in plain words. Empty while it can. */
  blockers: string[];
}

type LocalizationRow = {
  status: string;
  sourceRevision: number;
} & Record<string, unknown>;

/**
 * A unit is missing while no person has signed off text for every field it owes, and stale once
 * the canonical row has moved past the revision that text was written from. ADR 0015.
 */
function unitState(
  row: LocalizationRow | undefined,
  revision: number,
  fields: readonly string[],
): UnitState {
  if (row?.status !== "approved") return "missing";
  if (fields.some((field) => !String(row[field] ?? "").trim())) return "missing";
  return row.sourceRevision < revision ? "stale" : "ready";
}

/**
 * These read to a publisher in their own publishing flow, not to a learner, so they are plain
 * English rather than interface text. One is still one: "1 cards" would read as a bug.
 */
function say(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function tally(states: readonly UnitState[]) {
  return {
    ready: states.filter((state) => state === "ready").length,
    stale: states.filter((state) => state === "stale").length,
    missing: states.filter((state) => state === "missing").length,
  };
}

async function cardLocalizations(db: Db, ids: readonly string[], language: string) {
  const rows = await selectIn(ids, (slice) =>
    db
      .select()
      .from(schema.cardLocalizations)
      .where(
        and(
          inArray(schema.cardLocalizations.cardId, slice),
          eq(schema.cardLocalizations.language, language),
        ),
      ),
  );
  return new Map(rows.map((row) => [row.cardId, row as LocalizationRow]));
}

async function sectionLocalizations(db: Db, ids: readonly string[], language: string) {
  const rows = await selectIn(ids, (slice) =>
    db
      .select()
      .from(schema.sectionLocalizations)
      .where(
        and(
          inArray(schema.sectionLocalizations.sectionId, slice),
          eq(schema.sectionLocalizations.language, language),
        ),
      ),
  );
  return new Map(rows.map((row) => [row.sectionId, row as LocalizationRow]));
}

/**
 * How complete and how current one edition is. The deck's series is the owner's own grouping and
 * never reaches a member, so a series localization is optional and never holds an edition back.
 */
export async function reportEdition(
  db: Db,
  deckId: string,
  language: string,
  editionFields: readonly EditionCardField[],
): Promise<EditionReport> {
  const [[deck], sections, cards] = await Promise.all([
    db
      .select({ revision: schema.decks.revision })
      .from(schema.decks)
      .where(eq(schema.decks.id, deckId)),
    activeSectionsOf(db, deckId),
    activeCardsOf(db, deckId),
  ]);
  const [deckRows, sectionRows, cardRows] = await Promise.all([
    db
      .select()
      .from(schema.deckLocalizations)
      .where(
        and(
          eq(schema.deckLocalizations.deckId, deckId),
          eq(schema.deckLocalizations.language, language),
        ),
      ),
    sectionLocalizations(
      db,
      sections.map((row) => row.id),
      language,
    ),
    cardLocalizations(
      db,
      cards.map((row) => row.id),
      language,
    ),
  ]);

  const deckState = unitState(
    deckRows[0] as LocalizationRow | undefined,
    deck?.revision ?? 1,
    DECK_FIELDS,
  );
  const sectionStates = sections.map((section) =>
    unitState(sectionRows.get(section.id), section.revision, ["name"]),
  );
  const cardStates = cards.map((card) =>
    unitState(cardRows.get(card.id), card.revision, editionFields),
  );
  const totals = tally([deckState, ...sectionStates, ...cardStates]);

  const blockers: string[] = [];
  if (deckState === "missing") blockers.push("The deck's name and summary are not signed off.");
  if (deckState === "stale") blockers.push("The deck changed after its text was signed off.");
  const missingCards = cardStates.filter((state) => state === "missing").length;
  const staleCards = cardStates.filter((state) => state === "stale").length;
  const missingSections = sectionStates.filter((state) => state === "missing").length;
  const staleSections = sectionStates.filter((state) => state === "stale").length;
  if (missingCards)
    blockers.push(`${say(missingCards, "card has", "cards have")} no signed-off text.`);
  if (staleCards) {
    blockers.push(`${say(staleCards, "card", "cards")} changed after being signed off.`);
  }
  if (missingSections) {
    blockers.push(`${say(missingSections, "section has", "sections have")} no signed-off name.`);
  }
  if (staleSections) {
    blockers.push(`${say(staleSections, "section", "sections")} changed after being signed off.`);
  }
  if (cards.length === 0) blockers.push("The deck has no cards.");
  return { language, total: 1 + sections.length + cards.length, ...totals, blockers };
}

/**
 * The edition as the API shows it: where it stands publicly, and how complete its text is.
 */
async function editionView(
  db: Db,
  deckId: string,
  language: string,
  editionFields: readonly EditionCardField[],
): Promise<EditionOut> {
  const [row, report] = await Promise.all([
    editionRow(db, deckId, language),
    reportEdition(db, deckId, language, editionFields),
  ]);
  return {
    ...report,
    status: row?.status ?? "draft",
    revision: row?.revision ?? 0,
    publishedAt: row?.publishedAt?.toISOString() ?? null,
    withdrawnAt: row?.withdrawnAt?.toISOString() ?? null,
  };
}

/**
 * The deck, its canonical revision and its publication. Reading one is the owner's; writing or
 * publishing an edition is a publisher's, the same gate the deck's own publication has.
 */
async function publishedDeck(ctx: ServiceContext, deckId: string, publishers: Set<string> | null) {
  if (publishers) await assertPublisher(ctx, publishers);
  const owned = await ownedDeck(ctx, deckId);
  const [[publication], [row]] = await Promise.all([
    ctx.db.select().from(schema.deckPublications).where(eq(schema.deckPublications.deckId, deckId)),
    ctx.db
      .select({ revision: schema.decks.revision, seriesId: schema.decks.seriesId })
      .from(schema.decks)
      .where(eq(schema.decks.id, deckId)),
  ]);
  if (!publication) {
    throw new ServiceError("invalid", "Publish the deck before giving it another edition");
  }
  return {
    deck: { ...owned, revision: row?.revision ?? 1, seriesId: row?.seriesId ?? null },
    publication,
  };
}

function notTheOriginal(
  publication: typeof schema.deckPublications.$inferSelect,
  language: string,
) {
  if (language === publication.meaningLanguage) {
    throw new ServiceError("invalid", "That is the deck's original edition, which needs no text");
  }
}

/** Every edition of the deck with how complete it is, plus what the original is written in. */
export async function listEditions(ctx: ServiceContext, deckId: string): Promise<EditionsOut> {
  const { publication } = await publishedDeck(ctx, deckId, null);
  const rows = await ctx.db
    .select({ language: schema.deckEditions.language })
    .from(schema.deckEditions)
    .where(eq(schema.deckEditions.deckId, deckId))
    .orderBy(schema.deckEditions.language);
  return {
    originalMeaningLanguage: publication.meaningLanguage,
    editionFields: publication.editionFields,
    editions: await Promise.all(
      rows.map((row) => editionView(ctx.db, deckId, row.language, publication.editionFields)),
    ),
  };
}

async function editionRow(db: Db, deckId: string, language: string) {
  const [row] = await db
    .select()
    .from(schema.deckEditions)
    .where(and(eq(schema.deckEditions.deckId, deckId), eq(schema.deckEditions.language, language)));
  return row ?? null;
}

/**
 * Write one edition's text. Every row lands as a draft with the revision it was written from, so
 * text that arrives over an approved row is signed off again before anyone reads it. ADR 0015.
 */
export async function importEdition(
  ctx: ServiceContext,
  deckId: string,
  language: string,
  input: EditionImportInput,
  publishers: Set<string>,
): Promise<EditionOut> {
  const { db } = ctx;
  const { deck, publication } = await publishedDeck(ctx, deckId, publishers);
  notTheOriginal(publication, language);

  const [sections, cards] = await Promise.all([
    activeSectionsOf(db, deckId),
    activeCardsOf(db, deckId),
  ]);
  const sectionRevisions = new Map(sections.map((row) => [row.id, row.revision]));
  const cardRevisions = new Map(cards.map((row) => [row.id, row.revision]));
  for (const section of input.sections) {
    if (!sectionRevisions.has(section.sectionId)) {
      throw new ServiceError(
        "invalid",
        `${section.sectionId} is not an active section of the deck`,
      );
    }
  }
  const localizesTerm = publication.editionFields.includes("term");
  for (const card of input.cards) {
    if (!cardRevisions.has(card.cardId)) {
      throw new ServiceError("invalid", `${card.cardId} is not an active card of the deck`);
    }
    // A localized term replaces what the card asks. On a language deck that turns the prompt into
    // the answer, so only a publication that declares `term` may send one. ADR 0015.
    if (card.term && !localizesTerm) {
      throw new ServiceError(
        "invalid",
        "This deck's terms are shared by every edition. Add `term` to the publication's `editionFields` to localize them.",
      );
    }
  }

  const now = new Date();
  const draft = (provenance: LocalizationProvenance, sourceRevision: number) => ({
    language,
    provenance,
    status: "draft" as const,
    sourceRevision,
    approvedBy: null,
    approvedAt: null,
    updatedAt: now,
  });
  const statements: Statement[][] = [];

  if (input.deck) {
    const { provenance, ...fields } = input.deck;
    const values = { ...nulled(fields), ...draft(provenance, deck.revision) };
    statements.push([
      db
        .insert(schema.deckLocalizations)
        .values({ id: newId(), deckId, ...values })
        .onConflictDoUpdate({
          target: [schema.deckLocalizations.deckId, schema.deckLocalizations.language],
          set: values,
        }),
    ]);
  }
  if (input.series) {
    if (!deck.seriesId) throw new ServiceError("invalid", "The deck is not in a series");
    const { provenance, ...fields } = input.series;
    const [series] = await db
      .select({ revision: schema.series.revision })
      .from(schema.series)
      .where(eq(schema.series.id, deck.seriesId));
    const values = { ...nulled(fields), ...draft(provenance, series?.revision ?? 1) };
    statements.push([
      db
        .insert(schema.seriesLocalizations)
        .values({ id: newId(), seriesId: deck.seriesId, ...values })
        .onConflictDoUpdate({
          target: [schema.seriesLocalizations.seriesId, schema.seriesLocalizations.language],
          set: values,
        }),
    ]);
  }
  for (const { sectionId, provenance, ...fields } of input.sections) {
    const values = {
      ...nulled(fields),
      ...draft(provenance, sectionRevisions.get(sectionId) ?? 1),
    };
    statements.push([
      db
        .insert(schema.sectionLocalizations)
        .values({ id: newId(), sectionId, ...values })
        .onConflictDoUpdate({
          target: [schema.sectionLocalizations.sectionId, schema.sectionLocalizations.language],
          set: values,
        }),
    ]);
  }
  for (const { cardId, provenance, ...fields } of input.cards) {
    const values = { ...nulled(fields), ...draft(provenance, cardRevisions.get(cardId) ?? 1) };
    statements.push([
      db
        .insert(schema.cardLocalizations)
        .values({ id: newId(), cardId, ...values })
        .onConflictDoUpdate({
          target: [schema.cardLocalizations.cardId, schema.cardLocalizations.language],
          set: values,
        }),
    ]);
  }

  const existing = await editionRow(db, deckId, language);
  if (!existing) {
    statements.unshift([
      db.insert(schema.deckEditions).values({ id: newId(), deckId, language, status: "draft" }),
    ]);
  }
  statements.push([
    auditStatement(ctx, {
      entity: "deck",
      action: "import_edition",
      id: deckId,
      details: {
        language,
        deck: Boolean(input.deck),
        sections: input.sections.length,
        cards: input.cards.length,
      },
    }),
  ]);
  await runInBatches(db, statements);
  return editionView(db, deckId, language, publication.editionFields);
}

/** Fields the caller left out are cleared, so a second import never leaves older text behind. */
function nulled<T extends Record<string, unknown>>(fields: T) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value ?? null])) as {
    [K in keyof T]: T[K] | null;
  };
}

/**
 * A person signs off an edition's text. Approving also moves the row to the canonical revision
 * as it stands now, because that is what the person read it against. ADR 0015.
 */
export async function approveEdition(
  ctx: ServiceContext,
  deckId: string,
  language: string,
  input: EditionApprovalInput,
  publishers: Set<string>,
): Promise<EditionOut> {
  const { db, userId, actor } = ctx;
  if (actor !== "user") {
    throw new ServiceError("forbidden", "Only a person signs off an edition");
  }
  const { deck, publication } = await publishedDeck(ctx, deckId, publishers);
  notTheOriginal(publication, language);
  if (!(await editionRow(db, deckId, language))) throw new ServiceError("not_found", "No edition");

  const [sections, cards] = await Promise.all([
    activeSectionsOf(db, deckId),
    activeCardsOf(db, deckId),
  ]);
  const whole =
    !input.cardIds && !input.sectionIds && input.deck === undefined && input.series === undefined;
  const sectionIds = whole ? sections.map((row) => row.id) : (input.sectionIds ?? []);
  const cardIds = whole ? cards.map((row) => row.id) : (input.cardIds ?? []);
  // An id that names nothing would sign off nothing and then read as unsigned text, so say so.
  const known = new Set([...sections.map((row) => row.id), ...cards.map((row) => row.id)]);
  for (const id of [...sectionIds, ...cardIds]) {
    if (!known.has(id)) throw new ServiceError("invalid", `${id} is not in the deck`);
  }
  const now = new Date();
  const signed = {
    status: "approved" as const,
    approvedBy: userId,
    approvedAt: now,
    updatedAt: now,
  };
  const statements: Statement[][] = [];

  if (whole || input.deck) {
    statements.push([
      db
        .update(schema.deckLocalizations)
        .set({ ...signed, sourceRevision: deck.revision })
        .where(
          and(
            eq(schema.deckLocalizations.deckId, deckId),
            eq(schema.deckLocalizations.language, language),
          ),
        ),
    ]);
  }
  if ((whole || input.series) && deck.seriesId) {
    const [series] = await db
      .select({ revision: schema.series.revision })
      .from(schema.series)
      .where(eq(schema.series.id, deck.seriesId));
    statements.push([
      db
        .update(schema.seriesLocalizations)
        .set({ ...signed, sourceRevision: series?.revision ?? 1 })
        .where(
          and(
            eq(schema.seriesLocalizations.seriesId, deck.seriesId),
            eq(schema.seriesLocalizations.language, language),
          ),
        ),
    ]);
  }
  const wantedSections = new Set(sectionIds);
  const wantedCards = new Set(cardIds);
  for (const section of sections.filter((row) => wantedSections.has(row.id))) {
    statements.push([
      db
        .update(schema.sectionLocalizations)
        .set({ ...signed, sourceRevision: section.revision })
        .where(
          and(
            eq(schema.sectionLocalizations.sectionId, section.id),
            eq(schema.sectionLocalizations.language, language),
          ),
        ),
    ]);
  }
  for (const card of cards.filter((row) => wantedCards.has(row.id))) {
    statements.push([
      db
        .update(schema.cardLocalizations)
        .set({ ...signed, sourceRevision: card.revision })
        .where(
          and(
            eq(schema.cardLocalizations.cardId, card.id),
            eq(schema.cardLocalizations.language, language),
          ),
        ),
    ]);
  }
  statements.push([
    auditStatement(ctx, {
      entity: "deck",
      action: "approve_edition",
      id: deckId,
      details: { language, sections: sectionIds.length, cards: cardIds.length },
    }),
  ]);
  await runInBatches(db, statements);
  return editionView(db, deckId, language, publication.editionFields);
}

/**
 * Put an edition on the deck's public page and open it to new learners. An edition missing text
 * or written from an older revision is refused, so nobody adds a half-translated deck.
 */
export async function publishEdition(
  ctx: ServiceContext,
  deckId: string,
  language: string,
  publishers: Set<string>,
): Promise<EditionOut> {
  const { db, userId, actor } = ctx;
  if (actor !== "user") {
    throw new ServiceError("forbidden", "Only a person publishes an edition");
  }
  const { deck, publication } = await publishedDeck(ctx, deckId, publishers);
  notTheOriginal(publication, language);
  if (deck.archivedAt) throw new ServiceError("invalid", "Restore the deck before publishing it");
  if (publication.status !== "published") {
    throw new ServiceError("invalid", "Publish the deck before publishing another edition");
  }
  const report = await reportEdition(db, deckId, language, publication.editionFields);
  if (report.blockers.length > 0) {
    throw new ServiceError("invalid", "This edition is not ready to publish", report.blockers);
  }
  const now = new Date();
  const existing = await editionRow(db, deckId, language);
  if (!existing) throw new ServiceError("not_found", "No edition");
  await runBatch(db, [
    db
      .update(schema.deckEditions)
      .set({
        status: "published",
        revision: sql`revision + 1`,
        // The first publication date stays; a return from withdrawal is a new one.
        publishedAt: existing.status === "published" ? existing.publishedAt : now,
        withdrawnAt: null,
        publishedBy: userId,
        updatedAt: now,
      })
      .where(eq(schema.deckEditions.id, existing.id)),
    auditStatement(ctx, {
      entity: "deck",
      action: existing.status === "published" ? "update_edition" : "publish_edition",
      id: deckId,
      details: { language },
    }),
  ]);
  return editionView(db, deckId, language, publication.editionFields);
}

/** Take an edition off the public page. Learners who pinned it keep reading it. ADR 0015. */
export async function withdrawEdition(
  ctx: ServiceContext,
  deckId: string,
  language: string,
  publishers: Set<string>,
): Promise<EditionOut> {
  const { db } = ctx;
  const { publication } = await publishedDeck(ctx, deckId, publishers);
  const existing = await editionRow(db, deckId, language);
  if (!existing) throw new ServiceError("not_found", "No edition");
  if (existing.status !== "withdrawn") {
    const now = new Date();
    await runBatch(db, [
      db
        .update(schema.deckEditions)
        .set({
          status: "withdrawn",
          withdrawnAt: now,
          revision: sql`revision + 1`,
          updatedAt: now,
        })
        .where(eq(schema.deckEditions.id, existing.id)),
      auditStatement(ctx, {
        entity: "deck",
        action: "withdraw_edition",
        id: deckId,
        details: { language },
      }),
    ]);
  }
  return editionView(db, deckId, language, publication.editionFields);
}

/** Meaning languages a visitor may pick when adding the deck: the original, then every published one. */
export async function addableEditions(db: Db, deckId: string, original: string) {
  const rows = await db
    .select({ language: schema.deckEditions.language })
    .from(schema.deckEditions)
    .where(and(eq(schema.deckEditions.deckId, deckId), eq(schema.deckEditions.status, "published")))
    .orderBy(schema.deckEditions.language);
  return [original, ...rows.map((row) => row.language)];
}

/**
 * The edition each of these decks is read in by this learner: what they pinned when they added it.
 * A deck they own, or joined without choosing one, is absent and reads in its own words.
 */
export async function pinnedEditions(db: Db, userId: string, deckIds: readonly string[]) {
  const ids = [...new Set(deckIds)];
  if (ids.length === 0) return new Map<string, string>();
  const rows = await selectIn(ids, (slice) =>
    db
      .select({
        deckId: schema.deckMembers.deckId,
        language: schema.deckMembers.meaningLanguage,
      })
      .from(schema.deckMembers)
      .where(
        and(
          inArray(schema.deckMembers.deckId, slice),
          eq(schema.deckMembers.userId, userId),
          sql`${schema.deckMembers.removedAt} is null`,
          sql`${schema.deckMembers.meaningLanguage} is not null`,
        ),
      ),
  );
  return new Map(rows.flatMap((row) => (row.language ? [[row.deckId, row.language]] : [])));
}
