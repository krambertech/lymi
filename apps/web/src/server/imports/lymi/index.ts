import {
  type FieldRole,
  fieldsFromRoles,
  fitFields,
  type ImportedProgress,
  importTags,
  LYMI_FILE_VERSION,
  LymiFileCard,
  LymiFileManifest,
  type ReviewModeKey,
} from "@lymi/core";
import type { SourceAdapter, SourceNoteType, SourceSummary } from "../adapter";
import { ImportFileError, openZip, type RandomAccess, readZipEntry, type ZipEntry } from "../files";

/** The largest `cards.jsonl` a Worker reads beside its own work, as for an Anki collection. */
export const MAX_CARDS_BYTES = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 8 * 1024 * 1024;

export const LYMI_NOTE_TYPE = "lymi:card";
const FIELDS = ["Term", "Meaning", "Pronunciation", "Example", "Notes"];
const ROLES: FieldRole[] = ["term", "meaning", "pronunciation", "example", "notes"];

/** One card from a Lymi zip, with what its deck says about the cards that follow it. */
export type LymiNote = {
  card: LymiFileCard;
  deckModes: ReviewModeKey[];
  deckLanguage: string | null;
  /** Whether the zip holds the picture the card names. */
  picture: boolean;
};

async function openExport(file: RandomAccess) {
  const zip = await openZip(file);
  const manifestEntry = zip.get("lymi.json");
  const cardsEntry = zip.get("cards.jsonl");
  if (!manifestEntry || !cardsEntry) {
    throw new ImportFileError("unrecognized", "The file is not a Lymi export");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(
      new TextDecoder().decode(await readZipEntry(file, manifestEntry, MAX_MANIFEST_BYTES)),
    );
  } catch (err) {
    if (err instanceof ImportFileError) throw err;
    throw new ImportFileError("damaged", "The export's manifest is damaged");
  }
  const manifest = LymiFileManifest.safeParse(raw);
  if (!manifest.success || manifest.data.version > LYMI_FILE_VERSION) {
    throw new ImportFileError("unrecognized", "The export is not a Lymi export this version reads");
  }
  return { zip, manifest: manifest.data, cardsEntry };
}

/** Each line of `cards.jsonl` as a card, decoded one line at a time from the one copy of the bytes. */
function* lines(bytes: Uint8Array): Generator<LymiFileCard> {
  const decoder = new TextDecoder();
  let start = 0;
  while (start < bytes.length) {
    let end = bytes.indexOf(0x0a, start);
    if (end < 0) end = bytes.length;
    if (end > start) {
      let card: LymiFileCard;
      try {
        card = LymiFileCard.parse(JSON.parse(decoder.decode(bytes.subarray(start, end))));
      } catch {
        throw new ImportFileError("damaged", "A card in the export is damaged");
      }
      yield card;
    }
    start = end + 1;
  }
}

function progressOf(state: LymiFileCard["states"][number]): ImportedProgress {
  const started = state.state !== 0;
  return {
    mode: state.mode,
    reviews: state.reviews.map((review) => ({ at: new Date(review.at), rating: review.rating })),
    unstarted: !started,
    due: started ? new Date(state.due) : undefined,
    memory:
      started && state.lastReview !== null
        ? {
            stability: state.stability,
            difficulty: state.difficulty,
            lastReview: new Date(state.lastReview),
          }
        : undefined,
  };
}

export const lymi: SourceAdapter<LymiNote> = {
  source: "lymi",

  async detect(file) {
    try {
      await openExport(file);
      return true;
    } catch {
      return false;
    }
  },

  async inspect(file) {
    const { zip, manifest, cardsEntry } = await openExport(file);
    if (cardsEntry.size > MAX_CARDS_BYTES) {
      throw new ImportFileError("too_large", "The export's cards are too large");
    }
    const bytes = await readZipEntry(file, cardsEntry as ZipEntry, MAX_CARDS_BYTES);
    const decks = new Map(manifest.decks.map((deck) => [deck.id, deck]));
    const type: SourceNoteType = {
      key: LYMI_NOTE_TYPE,
      name: "Lymi card",
      kind: "basic",
      fields: FIELDS,
      roles: ROLES,
      questions: [0],
      notes: 0,
      samples: [],
    };
    const summary: SourceSummary = {
      decks: [],
      noteTypes: [type],
      notes: 0,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
      languages: Object.fromEntries(manifest.decks.map((deck) => [deck.id, deck.defaultLanguage])),
    };
    const counts = new Map<string, number>();
    for (const card of lines(bytes)) {
      if (!decks.has(card.deck)) throw new ImportFileError("damaged", "A card's deck is missing");
      summary.notes++;
      type.notes++;
      if (type.samples.length < 3) {
        type.samples.push([
          card.term,
          card.meaning ?? "",
          card.pronunciation ?? "",
          card.example ?? "",
          card.notes ?? "",
        ]);
      }
      summary.reviews += card.states.reduce((sum, state) => sum + state.reviews.length, 0);
      if (card.picture && zip.has(card.picture.file)) summary.pictures++;
      counts.set(card.deck, (counts.get(card.deck) ?? 0) + 1);
    }
    if (summary.notes === 0) {
      throw new ImportFileError("unrecognized", "The export holds no cards");
    }
    summary.decks = manifest.decks
      .filter((deck) => counts.has(deck.id))
      .map((deck) => ({
        key: deck.id,
        name: deck.name,
        description: deck.description,
        cards: counts.get(deck.id) ?? 0,
        archived: deck.archivedAt !== null,
      }));

    function* notes(): Generator<LymiNote> {
      for (const card of lines(bytes)) {
        const deck = decks.get(card.deck);
        yield {
          card,
          deckModes: deck?.reviewModes ?? ["term_to_meaning"],
          deckLanguage: deck?.defaultLanguage ?? null,
          picture: Boolean(card.picture && zip.has(card.picture.file)),
        };
      }
    }
    return { summary, notes: notes() };
  },

  cards(note, summary, choices) {
    const { card } = note;
    const type = summary.noteTypes[0];
    const roles = (type && choices.roles[type.key]) ?? ROLES;
    const raw = fieldsFromRoles(
      [
        card.term,
        card.meaning ?? "",
        card.pronunciation ?? "",
        card.example ?? "",
        card.notes ?? "",
      ],
      roles,
    );
    const fitted = fitFields({ term: raw.term ?? "", ...raw });
    if (!fitted.fields.term) return [];
    const tags = importTags(card.tags);
    const modes = card.reviewModes ?? note.deckModes;
    const progress = modes.map((mode) => {
      const state = card.states.find((s) => s.mode === mode);
      return state ? progressOf(state) : { mode, reviews: [], unstarted: true };
    });
    return [
      {
        externalId: `lymi:${card.id}`,
        deckKey: card.deck,
        noteTypeKey: LYMI_NOTE_TYPE,
        fields: fitted.fields,
        tags: tags.tags,
        modes,
        archived: card.archivedAt !== null,
        picture: note.picture ? card.picture?.file : undefined,
        progress,
        shortened: fitted.shortened || tags.shortened,
        // A card in its deck's language follows the language the learner chooses for the deck.
        language: card.language !== note.deckLanguage ? card.language : undefined,
        fieldSources: { meaning: card.meaningSource, example: card.exampleSource },
        origin: card.source ?? undefined,
        pictureDescription: card.picture?.description ?? undefined,
      },
    ];
  },

  async media(file) {
    const zip = await openZip(file);
    return async (name, limit) => {
      const entry = zip.get(name);
      if (!entry || !name.startsWith("media/")) return null;
      try {
        return await readZipEntry(file, entry, limit);
      } catch (err) {
        if (err instanceof ImportFileError && err.failure === "too_large") return null;
        throw err;
      }
    };
  },
};
