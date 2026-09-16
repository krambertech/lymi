import {
  directionsFromModes,
  fallbackMode,
  isImageMode,
  type LymiFileCard,
  type LymiFileState,
  modesFromDirections,
  type ReviewModeKey,
} from "@lymi/core";
import { ANKI_DAY_SECONDS, ANKI_SEPARATOR, ankiDayNumber } from "../imports/anki/model";
import { SqliteWriter, type SqlWriteValue, type TableWriter } from "./sqlite-writer";

/**
 * A legacy Anki collection: schema 11 with JSON note types, what AnkiWeb and every app that
 * reads `.apkg` understands. One note per Lymi card in a Lymi note type; FSRS memory in
 * `cards.data`, due dates in Anki's three encodings, and the learner's grades as `revlog` rows.
 */

/** The collection's first day, 5 October 2006 at 04:00 UTC, before any date Lymi holds. */
export const ANKI_CREATED = Date.UTC(2006, 9, 5, 4) / 1000;

/** The largest collection an export writes in one step; a larger library is exported per deck. */
export const MAX_ANKI_COLLECTION_BYTES = 64 * 1024 * 1024;

/** A deck as Anki names it. */
export type AnkiDeckInput = {
  key: string;
  name: string;
  description: string | null;
  /** An archived deck's cards arrive suspended. */
  archived?: boolean | undefined;
};

/** A card to write, with the media names its fields refer to. */
export type AnkiCardInput = {
  card: LymiFileCard;
  /** The text modes the card is asked in, in the learner's deck. */
  modes: ReviewModeKey[];
  picture: string | null;
  sound: string | null;
};

const FIELDS = ["Term", "Meaning", "Pronunciation", "Example", "Notes", "Picture", "Audio"];

const BACK = (answer: string) =>
  [
    "{{FrontSide}}",
    "",
    "<hr id=answer>",
    "",
    `<div class="answer">{{${answer}}}</div>`,
    '{{#Pronunciation}}<div class="pronunciation">{{Pronunciation}}</div>{{/Pronunciation}}',
    '{{#Example}}<div class="example">{{Example}}</div>{{/Example}}',
    '{{#Notes}}<div class="notes">{{Notes}}</div>{{/Notes}}',
    '{{#Picture}}<div class="picture">{{Picture}}</div>{{/Picture}}',
    "{{Audio}}",
  ].join("\n");

const TEMPLATES = {
  term_to_meaning: { name: "Term → Meaning", qfmt: "{{Term}}", afmt: BACK("Meaning"), field: 0 },
  meaning_to_term: { name: "Meaning → Term", qfmt: "{{Meaning}}", afmt: BACK("Term"), field: 1 },
} as const;

/**
 * The card's schedule for a template. A picture mode has no Anki template of its own, so it goes on
 * the text template that stands in for it, and the started schedule wins: a card asked only by its
 * picture also carries an untouched text state, which would otherwise export as a new card.
 */
function stateForTemplate(card: LymiFileCard, mode: ReviewModeKey): LymiFileState | undefined {
  const exact = card.states.find((state) => state.mode === mode);
  const standIn = card.states.find(
    (state) => isImageMode(state.mode) && fallbackMode(state.mode) === mode,
  );
  const started = (state: LymiFileState | undefined) =>
    state && (state.state !== 0 || state.reviews.length > 0);
  if (started(exact)) return exact;
  return started(standIn) ? standIn : (exact ?? standIn);
}

const CSS = `.card {
  font-family: system-ui, sans-serif;
  font-size: 22px;
  line-height: 1.5;
  text-align: center;
  color: black;
  background-color: white;
}
.nightMode.card { color: white; background-color: #1f1c19; }
.answer { font-size: 26px; }
.pronunciation, .example, .notes { margin-top: 12px; font-size: 18px; opacity: 0.8; }
.picture img { max-width: 100%; max-height: 50vh; margin-top: 12px; }
`;

/** The three Lymi note types, with fixed ids so a second export updates the same note type in Anki. */
export const ANKI_MODELS = {
  recognition: { id: 1_789_500_000_001, name: "Lymi", modes: ["term_to_meaning"] },
  production: { id: 1_789_500_000_002, name: "Lymi (meaning first)", modes: ["meaning_to_term"] },
  both: {
    id: 1_789_500_000_003,
    name: "Lymi (both ways)",
    modes: ["term_to_meaning", "meaning_to_term"],
  },
} as const satisfies Record<string, { id: number; name: string; modes: ReviewModeKey[] }>;

function modelJson(model: (typeof ANKI_MODELS)[keyof typeof ANKI_MODELS], mod: number) {
  const modes = model.modes as readonly ReviewModeKey[];
  return {
    id: model.id,
    name: model.name,
    type: 0,
    mod,
    usn: -1,
    sortf: 0,
    did: null,
    tmpls: modes.map((mode, ord) => {
      const template = TEMPLATES[mode as keyof typeof TEMPLATES];
      return {
        name: template.name,
        ord,
        qfmt: template.qfmt,
        afmt: template.afmt,
        bqfmt: "",
        bafmt: "",
        did: null,
        bfont: "",
        bsize: 0,
      };
    }),
    flds: FIELDS.map((name, ord) => ({
      name,
      ord,
      sticky: false,
      rtl: false,
      font: "Arial",
      size: 20,
      description: "",
      plainText: false,
      collapsed: false,
      excludeFromSearch: false,
    })),
    css: CSS,
    latexPre:
      "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
    latexsvg: false,
    req: modes.map((mode, ord) => [ord, "any", [TEMPLATES[mode as keyof typeof TEMPLATES].field]]),
  };
}

function deckJson(id: number, name: string, description: string, mod: number) {
  return {
    id,
    mod,
    name,
    usn: -1,
    lrnToday: [0, 0],
    revToday: [0, 0],
    newToday: [0, 0],
    timeToday: [0, 0],
    collapsed: false,
    browserCollapsed: false,
    desc: description,
    dyn: 0,
    conf: 1,
    extendNew: 0,
    extendRev: 0,
  };
}

const DECK_CONFIG = {
  id: 1,
  mod: 0,
  name: "Default",
  usn: 0,
  maxTaken: 60,
  autoplay: true,
  timer: 0,
  replayq: true,
  new: { bury: false, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 0], order: 1, perDay: 20 },
  rev: { bury: false, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
  lapse: { delays: [10], leechAction: 1, leechFails: 8, minInt: 1, mult: 0 },
  dyn: false,
};

/** Plain text as an Anki field: HTML special characters escaped, line breaks as `<br>`. */
export function ankiField(text: string | null | undefined): string {
  return (text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(ANKI_SEPARATOR, " ")
    .replace(/\r?\n/g, "<br>");
}

/** Anki's tags cannot hold spaces. */
export function ankiTags(tags: readonly string[]): string {
  const cleaned = tags.map((tag) => tag.trim().replace(/\s+/g, "_")).filter(Boolean);
  return cleaned.length > 0 ? ` ${cleaned.join(" ")} ` : "";
}

/** Anki's duplicate checksum: the first eight hex digits of the sort field's SHA-1. */
async function checksum(text: string): Promise<number> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text)),
  );
  return (
    ((digest[0] as number) * 0x1000000 +
      ((digest[1] as number) << 16) +
      ((digest[2] as number) << 8) +
      (digest[3] as number)) >>>
    0
  );
}

/** A state's place in Anki's card columns: type, queue, due, interval and the FSRS data. */
export function ankiSchedule(state: LymiFileState | undefined, position: number) {
  if (!state || state.state === 0) {
    return { type: 0, queue: 0, due: position, ivl: 0, left: 0, data: "{}" };
  }
  const last = state.lastReview ?? state.due;
  const days = Math.max(1, Math.round((state.due - last) / (ANKI_DAY_SECONDS * 1000)));
  const data = JSON.stringify({
    s: round(state.stability),
    d: round(state.difficulty),
    dr: 0.9,
    ...(state.lastReview !== null ? { lrt: Math.floor(state.lastReview / 1000) } : {}),
  });
  if (state.state === 2) {
    return {
      type: 2,
      queue: 2,
      due: ankiDayNumber(state.due, ANKI_CREATED),
      ivl: days,
      left: 0,
      data,
    };
  }
  // Learning and relearning steps are due at a moment, in seconds.
  return {
    type: state.state === 3 ? 3 : 1,
    queue: 1,
    due: Math.floor(state.due / 1000),
    ivl: state.state === 3 ? days : 0,
    left: 1,
    data,
  };
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

/** Anki's review type from the FSRS state before the grade: learning, review or relearning. */
function revlogType(stateBefore: number) {
  return stateBefore === 2 ? 1 : stateBefore === 3 ? 2 : 0;
}

/** Ids that are timestamps in ms, kept unique by moving a clash one millisecond on. */
class Ids {
  private last = 0;
  next(at: number) {
    this.last = Math.max(Math.floor(at), this.last + 1);
    return this.last;
  }
}

const SCHEMA = {
  col: "CREATE TABLE col (\n  id integer PRIMARY KEY,\n  crt integer NOT NULL,\n  mod integer NOT NULL,\n  scm integer NOT NULL,\n  ver integer NOT NULL,\n  dty integer NOT NULL,\n  usn integer NOT NULL,\n  ls integer NOT NULL,\n  conf text NOT NULL,\n  models text NOT NULL,\n  decks text NOT NULL,\n  dconf text NOT NULL,\n  tags text NOT NULL\n)",
  notes:
    "CREATE TABLE notes (\n  id integer PRIMARY KEY,\n  guid text NOT NULL,\n  mid integer NOT NULL,\n  mod integer NOT NULL,\n  usn integer NOT NULL,\n  tags text NOT NULL,\n  flds text NOT NULL,\n  sfld integer NOT NULL,\n  csum integer NOT NULL,\n  flags integer NOT NULL,\n  data text NOT NULL\n)",
  cards:
    "CREATE TABLE cards (\n  id integer PRIMARY KEY,\n  nid integer NOT NULL,\n  did integer NOT NULL,\n  ord integer NOT NULL,\n  mod integer NOT NULL,\n  usn integer NOT NULL,\n  type integer NOT NULL,\n  queue integer NOT NULL,\n  due integer NOT NULL,\n  ivl integer NOT NULL,\n  factor integer NOT NULL,\n  reps integer NOT NULL,\n  lapses integer NOT NULL,\n  left integer NOT NULL,\n  odue integer NOT NULL,\n  odid integer NOT NULL,\n  flags integer NOT NULL,\n  data text NOT NULL\n)",
  revlog:
    "CREATE TABLE revlog (\n  id integer PRIMARY KEY,\n  cid integer NOT NULL,\n  usn integer NOT NULL,\n  ease integer NOT NULL,\n  ivl integer NOT NULL,\n  lastIvl integer NOT NULL,\n  factor integer NOT NULL,\n  time integer NOT NULL,\n  type integer NOT NULL\n)",
  graves:
    "CREATE TABLE graves (\n  usn integer NOT NULL,\n  oid integer NOT NULL,\n  type integer NOT NULL\n)",
};

const index = (name: string, table: string, columns: string, positions: number[]) => ({
  name,
  sql: `CREATE INDEX ${name} ON ${table} (${columns})`,
  columns: positions,
});

/** Grades buffered as numbers and written in id order once every card is in. */
class RevlogBuffer {
  private data = new Float64Array(8 * 1024);
  length = 0;

  get byteLength() {
    return this.length * 8;
  }

  push(
    id: number,
    cid: number,
    ease: number,
    ivl: number,
    lastIvl: number,
    factor: number,
    type: number,
  ) {
    if (this.length + 8 > this.data.length) {
      const grown = new Float64Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data.set([id, cid, ease, ivl, lastIvl, factor, type], this.length);
    this.length += 8;
  }
  write(table: TableWriter) {
    const rows = this.length / 8;
    const order = Array.from({ length: rows }, (_, i) => i).sort(
      (a, b) => (this.data[a * 8] as number) - (this.data[b * 8] as number),
    );
    let last = 0;
    for (const row of order) {
      const at = row * 8;
      // Two cards graded in the same millisecond keep both grades.
      const id = Math.max(this.data[at] as number, last + 1);
      last = id;
      table.insert(id, [
        null,
        this.data[at + 1] as number,
        -1,
        this.data[at + 2] as number,
        this.data[at + 3] as number,
        this.data[at + 4] as number,
        this.data[at + 5] as number,
        0,
        this.data[at + 6] as number,
      ]);
    }
  }
}

export class AnkiCollection {
  private readonly db = new SqliteWriter();
  private readonly notes: TableWriter;
  private readonly cards: TableWriter;
  private readonly decks = new Map<
    string,
    { id: number; name: string; description: string; archived: boolean }
  >();
  private readonly deckIds = new Ids();
  private readonly noteIds = new Ids();
  private readonly cardIds = new Ids();
  private readonly revlog = new RevlogBuffer();
  private readonly mod: number;
  private position = 0;
  reviews = 0;

  constructor(
    decks: readonly AnkiDeckInput[],
    private readonly now: Date,
  ) {
    this.mod = Math.floor(now.getTime() / 1000);
    this.notes = this.db.table("notes", SCHEMA.notes, [
      index("ix_notes_usn", "notes", "usn", [4]),
      index("ix_notes_csum", "notes", "csum", [8]),
    ]);
    this.cards = this.db.table("cards", SCHEMA.cards, [
      index("ix_cards_usn", "cards", "usn", [5]),
      index("ix_cards_nid", "cards", "nid", [1]),
      index("ix_cards_sched", "cards", "did, queue, due", [2, 7, 8]),
    ]);
    const taken = new Set<string>(["default"]);
    for (const deck of decks) {
      // Anki merges decks by name, so two Lymi decks of one name stay apart.
      let name = deck.name.trim() || "Lymi";
      for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${deck.name} (${n})`;
      taken.add(name.toLowerCase());
      this.decks.set(deck.key, {
        id: this.deckIds.next(1_700_000_000_000),
        name,
        description: ankiField(deck.description),
        archived: deck.archived ?? false,
      });
    }
  }

  get byteLength() {
    // The grades are still in their buffer until `finish`, and they are most of a large collection.
    return this.db.byteLength + this.revlog.byteLength;
  }

  async add({ card, modes, picture, sound }: AnkiCardInput) {
    const deck = this.decks.get(card.deck);
    if (!deck) throw new Error("A card's deck is not in the collection");
    const kind = directionsFromModes(modes);
    const model = ANKI_MODELS[kind];
    const fields = [
      ankiField(card.term),
      ankiField(card.meaning),
      ankiField(card.pronunciation),
      ankiField(card.example),
      ankiField(card.notes),
      picture ? `<img src="${ankiField(picture)}">` : "",
      sound ? `[sound:${sound}]` : "",
    ];
    const noteId = this.noteIds.next(card.createdAt);
    this.notes.insert(noteId, [
      null,
      `lymi:${card.id}`,
      model.id,
      this.mod,
      -1,
      ankiTags(card.tags),
      fields.join(ANKI_SEPARATOR),
      card.term,
      await checksum(card.term),
      0,
      "",
    ]);
    const suspended = card.archivedAt !== null || deck.archived;
    (model.modes as readonly ReviewModeKey[]).forEach((mode, ord) => {
      // Anki drops a card whose question field is empty, so one is never written; a note keeps its
      // first card either way, because a note with no cards is not imported at all.
      if (ord > 0 && !fields[TEMPLATES[mode as keyof typeof TEMPLATES].field]) return;
      const state = stateForTemplate(card, mode);
      const schedule = ankiSchedule(state, this.position++);
      const cardId = this.cardIds.next(card.createdAt);
      const reviews = state?.reviews ?? [];
      let lastIvl = 0;
      let lapses = 0;
      for (const review of reviews) {
        const ivl = review.scheduledDays > 0 ? Math.round(review.scheduledDays) : -600;
        if (review.state === 2 && review.rating === 1) lapses++;
        this.revlog.push(
          review.at,
          cardId,
          review.rating,
          ivl,
          lastIvl,
          review.state === 0 ? 0 : 2500,
          revlogType(review.state),
        );
        lastIvl = ivl;
      }
      this.reviews += reviews.length;
      this.cards.insert(cardId, [
        null,
        noteId,
        deck.id,
        ord,
        this.mod,
        -1,
        schedule.type,
        suspended ? -1 : schedule.queue,
        schedule.due,
        schedule.ivl,
        schedule.type === 0 ? 0 : 2500,
        reviews.length,
        lapses,
        schedule.left,
        0,
        0,
        0,
        schedule.data,
      ] satisfies SqlWriteValue[]);
    });
  }

  /** The database's pages, once every card is added. */
  finish(): Uint8Array[] {
    this.notes.close();
    this.cards.close();
    const revlog = this.db.table("revlog", SCHEMA.revlog, [
      index("ix_revlog_usn", "revlog", "usn", [2]),
      index("ix_revlog_cid", "revlog", "cid", [1]),
    ]);
    this.revlog.write(revlog);
    revlog.close();
    this.db.table("graves", SCHEMA.graves).close();

    const decks: Record<string, unknown> = { 1: deckJson(1, "Default", "", 0) };
    for (const deck of this.decks.values()) {
      decks[deck.id] = deckJson(deck.id, deck.name, deck.description, this.mod);
    }
    const models = Object.fromEntries(
      Object.values(ANKI_MODELS).map((model) => [model.id, modelJson(model, this.mod)]),
    );
    const conf = {
      schedVer: 2,
      sched2021: true,
      creationOffset: 0,
      activeDecks: [1],
      curDeck: 1,
      curModel: ANKI_MODELS.recognition.id,
      nextPos: this.position,
      estTimes: true,
      dueCounts: true,
      collapseTime: 1200,
      sortType: "noteFld",
      sortBackwards: false,
      addToCur: true,
      newSpread: 0,
      timeLim: 0,
      dayLearnFirst: false,
    };
    const col = this.db.table("col", SCHEMA.col);
    const ms = this.now.getTime();
    col.insert(1, [
      null,
      ANKI_CREATED,
      ms,
      ms,
      11,
      0,
      0,
      0,
      JSON.stringify(conf),
      JSON.stringify(models),
      JSON.stringify(decks),
      JSON.stringify({ 1: DECK_CONFIG }),
      "{}",
    ]);
    col.close();
    return this.db.finish();
  }
}

/** Anki's own stand-in for the old container name, read only by versions too old for the real one. */
export async function ankiPlaceholder(now: Date): Promise<Uint8Array[]> {
  const collection = new AnkiCollection(
    [{ key: "placeholder", name: "Default", description: null }],
    now,
  );
  await collection.add({
    card: {
      id: "placeholder",
      deck: "placeholder",
      section: null,
      term: "Please update to the latest Anki version, then import the .colpkg/.apkg file again.",
      meaning: null,
      pronunciation: null,
      example: null,
      notes: null,
      language: null,
      tags: [],
      source: null,
      meaningSource: null,
      exampleSource: null,
      pronunciationSource: null,
      reviewModes: null,
      picture: null,
      archivedAt: null,
      createdAt: now.getTime(),
      states: [],
    },
    modes: modesFromDirections("recognition"),
    picture: null,
    sound: null,
  });
  return collection.finish();
}
