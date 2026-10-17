import { Rating as FsrsRating } from "ts-fsrs";
import { z } from "zod";
import {
  DECK_ENRICH_FIELDS,
  DECK_PURPOSES,
  ENRICH_INSTRUCTIONS_MAX,
  ENRICHED_FIELDS,
} from "./enrichment";
import { OPEN } from "./responses/common";

/** Which way the card is asked. Recognition: see the term, recall the meaning. Production: the reverse. */
export const Direction = z.enum(["recognition", "production"]);
export type Direction = z.infer<typeof Direction>;

/** FSRS grade. 1 Again, 2 Hard, 3 Good, 4 Easy. Closed: the scheduler has exactly four. */
export const Rating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Rating = z.infer<typeof Rating>;

/** Where a field's content came from. Shown in the UI so AI text is never mistaken for the lesson. */
export const FieldSource = z.enum(["lesson", "ai", "manual"]);
export type FieldSource = z.infer<typeof FieldSource>;

/**
 * What a caller may say about a field it sends. "ai" is Lymi's own enrichment and nothing else,
 * so the AI badge only ever marks text the app filled in; what an integration writes is the
 * learner's, whoever composed it, and Activity names the app that sent it.
 */
export const StatedFieldSource = FieldSource.exclude(["ai"]).meta({
  description:
    '"lesson" when the text is in the material, "manual" otherwise. Left out, text is recorded as "manual". Only Lymi\'s own enrichment writes "ai".',
});
export type StatedFieldSource = z.infer<typeof StatedFieldSource>;

/** Where a card's enrichment stands. Null once nothing is outstanding. */
export const EnrichmentStatus = z.enum(["working", "failed"]);
export type EnrichmentStatus = z.infer<typeof EnrichmentStatus>;

/** A field enrichment fills. */
export const EnrichedFieldName = z.enum(ENRICHED_FIELDS);

/** What AI may fill on a deck's cards. The language is filled whatever the deck chooses. */
export const DeckEnrichFields = z
  .array(z.enum(DECK_ENRICH_FIELDS).meta(OPEN))
  .max(DECK_ENRICH_FIELDS.length)
  .refine((fields) => new Set(fields).size === fields.length, "List each field once.")
  .meta({
    id: "DeckEnrichFields",
    description:
      "The empty fields AI may fill on the deck's cards, on an add in the app, an add sent with enrich true, or Enrich on one card. It fills those that suit each card, following the deck's own cards. The language is always filled. Until the owner chooses, the deck follows its purpose and language: meaning alone for a subject, other or language-less deck, meaning and example for most languages, plus notes or pronunciation for some (ADR 0033).",
  });
export type DeckEnrichFields = z.infer<typeof DeckEnrichFields>;

/** What a deck is for, which picks its starting enrichment fields and tells the AI how to write. */
export const DeckPurpose = z.enum(DECK_PURPOSES).meta({
  ...OPEN,
  id: "DeckPurpose",
  description:
    "What the deck is for: language, a language being learned; subject, a subject or exam; other, anything else. Until the owner chooses enrichFields, it picks them: a language's preset, or the meaning alone. Left out on a create, a deck with a language is a language deck and any other is other.",
});
export type DeckPurpose = z.infer<typeof DeckPurpose>;

/** The deck owner's own words to the AI about the deck. Null clears them. */
export const DeckEnrichInstructions = z
  .string()
  .trim()
  .max(
    ENRICH_INSTRUCTIONS_MAX,
    `Keep the instructions under ${ENRICH_INSTRUCTIONS_MAX} characters.`,
  )
  .nullable()
  .meta({
    description:
      "What the deck is about and how the AI should write its cards, such as the register, the senses to prefer or how short a meaning is. Only the owner sees them. They shape the text but never which fields are filled.",
  });

/** Who performed an action. Written to the audit log. */
export const Actor = z.enum(["user", "api", "mcp", "ai", "system"]);
export type Actor = z.infer<typeof Actor>;

/**
 * What a key or OAuth grant may do. `read` lists and searches. `write` also adds, edits and
 * archives decks and cards. Reviews are never writable by an integration, whatever the scope.
 */
export const Scope = z.enum(["read", "write"]);
export type Scope = z.infer<typeof Scope>;

/**
 * BCP 47 language tag, loosely validated. "it", "pt-BR", "uk". The messages are written for
 * a person because they are shown to one: the interface parses with these same schemas, so
 * whatever the API says on a 400 is what the field says under the control.
 */
export const LanguageTag = z
  .string()
  .min(2, "A language tag is at least two letters, like it or uk.")
  .max(12, "Keep the language tag under 12 characters.")
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a language tag like ca, pt-BR or zh-Hant.");

/** Which way a deck (or a single card) is asked. The legacy form of `reviewModes`. ADR 0014. */
export const Directions = z.enum(["recognition", "production", "both"]);
export type Directions = z.infer<typeof Directions>;

/** The stable key persistence uses for one review mode. ADR 0014. */
export const REVIEW_MODE_KEYS = [
  "term_to_meaning",
  "meaning_to_term",
  "image_to_term",
  "image_to_meaning",
] as const;
export const ReviewModeKey = z.enum(REVIEW_MODE_KEYS);
export type ReviewModeKey = z.infer<typeof ReviewModeKey>;

/** What a review shows before reveal and what the learner grades, one of four pairs. */
export const ReviewMode = z
  .union([
    z.object({ cue: z.literal("term"), target: z.literal("meaning") }),
    z.object({ cue: z.literal("meaning"), target: z.literal("term") }),
    z.object({ cue: z.literal("image"), target: z.literal("term") }),
    z.object({ cue: z.literal("image"), target: z.literal("meaning") }),
  ])
  .meta({
    ...OPEN,
    id: "ReviewMode",
    description: "The cue shown before reveal and the target the learner grades",
  });
export type ReviewMode = z.infer<typeof ReviewMode>;

/** How a deck, or a card on its own, is asked; picture modes belong on cards. */
export const ReviewModes = z
  .array(ReviewMode)
  .min(1, "Choose at least one review mode.")
  .max(REVIEW_MODE_KEYS.length)
  .refine(
    (modes) => new Set(modes.map((m) => `${m.cue}:${m.target}`)).size === modes.length,
    "List each review mode once.",
  );

/** Ask one address into a deck. Lowercased here so a repeat cannot make a second invitation. */
export const InviteInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});
export type InviteInput = z.infer<typeof InviteInput>;

/** How many people may be waiting on an invitation to one deck at once. ADR 0011. */
export const PENDING_INVITATION_LIMIT = 20;

/** Why an invitation was refused, carried in `issues` so the app can say it in the learner's language. */
export type InviteRefusal = "owner" | "member" | "removed" | "invited" | "full";

/** What a learner may do in a deck. Only `owner` and `learner` are granted today. ADR 0011. */
export const MemberRole = z.enum(["owner", "editor", "contributor", "learner"]);
export type MemberRole = z.infer<typeof MemberRole>;

/** How a deck's sections open for each learner. */
export const SECTION_PROGRESSIONS = ["automatic", "manual", "open"] as const;
export const SectionProgression = z.enum(SECTION_PROGRESSIONS).meta({
  ...OPEN,
  id: "SectionProgression",
  description:
    "How each learner's sections open. automatic, the default: the next section opens once every card of the current one has come up and 80% are Known. manual: it becomes ready then, and the learner starts it. open: every section is open. Anyone can start a later section early.",
});
export type SectionProgression = z.infer<typeof SectionProgression>;

/**
 * An id the caller chose for what it creates, in `newId`'s alphabet. Sending the same create
 * again returns what the first one made instead of making a second, so an offline write replays safely.
 */
export const ClientId = z
  .string()
  .regex(/^[0-9a-z]{16,40}$/, "Use 16 to 40 lowercase letters and digits.")
  .meta({
    description:
      "Optional id for the new item, 16 to 40 lowercase letters and digits. A create repeated with the same id returns the first result instead of adding again.",
  });

export const DeckInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the deck a name.")
    .max(80, "Keep the name under 80 characters."),
  /** Null clears it, so a description can be taken back off a deck. */
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters.")
    .nullable()
    .optional(),
  defaultLanguage: LanguageTag.nullable().optional(),
  directions: Directions.optional().meta({ description: "Legacy form of `reviewModes`" }),
  reviewModes: ReviewModes.optional().meta({
    description: "Text modes only. Picture modes are set on each card.",
  }),
  seriesId: z.string().min(1).nullable().optional().meta({
    description:
      "One of the owner's active series; the deck goes last in it. Null takes the deck out of its series.",
  }),
  sectionProgression: SectionProgression.optional(),
  purpose: DeckPurpose.optional(),
  enrichFields: DeckEnrichFields.optional(),
  enrichInstructions: DeckEnrichInstructions.optional(),
});
export type DeckInput = z.infer<typeof DeckInput>;

/** A deck's text limits, read off `DeckInput` the way `cardLimits` reads a card's. */
export const deckLimits = {
  name: DeckInput.shape.name.maxLength,
  description: DeckInput.shape.description.unwrap().unwrap().maxLength,
  enrichInstructions: ENRICH_INSTRUCTIONS_MAX,
} satisfies Record<string, number | null>;

export const NewDeckInput = DeckInput.extend({ id: ClientId.optional() });
export type NewDeckInput = z.infer<typeof NewDeckInput>;

/** Card fields an edition may carry. The rest of the card is shared by every edition. ADR 0015. */
export const EDITION_CARD_FIELDS = [
  "term",
  "meaning",
  "pronunciation",
  "example",
  "notes",
] as const;
export const EditionCardField = z.enum(EDITION_CARD_FIELDS);
export type EditionCardField = z.infer<typeof EditionCardField>;

/** Who wrote a localization. Only a human approves one, whatever wrote it. ADR 0015. */
export const LOCALIZATION_PROVENANCES = ["human", "ai", "imported"] as const;
export const LocalizationProvenance = z.enum(LOCALIZATION_PROVENANCES).meta({
  id: "LocalizationProvenance",
  description:
    "human: written by a person. ai: drafted by the AI. imported: brought in from a file.",
});
export type LocalizationProvenance = z.infer<typeof LocalizationProvenance>;

/** How far a localization has got. Only `approved` rows reach a reader. */
export const LOCALIZATION_STATUSES = ["draft", "in_review", "approved"] as const;
export const LocalizationStatus = z.enum(LOCALIZATION_STATUSES).meta({
  id: "LocalizationStatus",
  description:
    "draft: being written. in_review: waiting for a person. approved: a person signed it off.",
});
export type LocalizationStatus = z.infer<typeof LocalizationStatus>;

/** Where one meaning-language edition of a published deck stands. */
export const EDITION_STATUSES = ["draft", "published", "withdrawn"] as const;
export const EditionStatus = z.enum(EDITION_STATUSES).meta({ id: "EditionStatus" });
export type EditionStatus = z.infer<typeof EditionStatus>;

const LocalizedText = (max: number) => z.string().trim().max(max).nullable().optional();

/** The meaning-side text of one card in one edition. A field left null keeps the original. */
export const CardLocalizationFields = z.object({
  term: LocalizedText(500),
  meaning: LocalizedText(2000),
  pronunciation: LocalizedText(200),
  example: LocalizedText(2000),
  notes: LocalizedText(2000),
});
export type CardLocalizationFields = z.infer<typeof CardLocalizationFields>;

export const DeckLocalizationFields = z.object({
  name: LocalizedText(80),
  description: LocalizedText(500),
  summary: LocalizedText(500).meta({ description: "The public page's summary in this language" }),
});
export type DeckLocalizationFields = z.infer<typeof DeckLocalizationFields>;

export const SectionLocalizationFields = z.object({ name: LocalizedText(80) });
export type SectionLocalizationFields = z.infer<typeof SectionLocalizationFields>;

export const SeriesLocalizationFields = z.object({ name: LocalizedText(80) });
export type SeriesLocalizationFields = z.infer<typeof SeriesLocalizationFields>;

/** Provenance every written localization declares. A row never claims to be human on its own. */
const Written = {
  provenance: LocalizationProvenance.meta({ description: "Who wrote this text" }),
};

export const CardLocalizationInput = CardLocalizationFields.extend({
  cardId: z.string().min(1),
  ...Written,
});
export type CardLocalizationInput = z.infer<typeof CardLocalizationInput>;

/** The most cards one edition call takes. A longer edition is sent in parts, which all land in the same edition. */
export const EDITION_IMPORT_CARDS = 500;

/**
 * One edition's text, or one part of it, written so a retry lands the same. Rows arrive as
 * drafts; a person approves them before the edition can be published. ADR 0015.
 */
export const EditionImportInput = z
  .object({
    deck: DeckLocalizationFields.extend(Written).optional(),
    series: SeriesLocalizationFields.extend(Written).optional().meta({
      description: "The owner's series holding the deck, when it is in one",
    }),
    sections: z
      .array(SectionLocalizationFields.extend({ sectionId: z.string().min(1), ...Written }))
      .max(500)
      .refine(
        (rows) => new Set(rows.map((row) => row.sectionId)).size === rows.length,
        "List each section once.",
      )
      .default([]),
    cards: z
      .array(CardLocalizationInput)
      .max(
        EDITION_IMPORT_CARDS,
        `Send at most ${EDITION_IMPORT_CARDS} cards per call, and the rest in further calls.`,
      )
      .refine(
        (rows) => new Set(rows.map((row) => row.cardId)).size === rows.length,
        "List each card once.",
      )
      .default([]),
  })
  .meta({ id: "EditionImport" });
export type EditionImportInput = z.infer<typeof EditionImportInput>;

/** Which rows a person is signing off. Empty lists mean the whole edition. */
export const EditionApprovalInput = z
  .object({
    cardIds: z.array(z.string().min(1)).max(500).optional(),
    sectionIds: z.array(z.string().min(1)).max(500).optional(),
    deck: z.boolean().optional(),
    series: z.boolean().optional(),
  })
  .meta({ id: "EditionApproval" });
export type EditionApprovalInput = z.infer<typeof EditionApprovalInput>;

/**
 * The edition a learner picks when adding a published deck. It is pinned and never changes. It
 * rides as a query parameter because adding has always taken no body, and still does.
 */
export const AddQuery = z
  .object({
    meaningLanguage: LanguageTag.optional().meta({
      description:
        "A published edition of the deck, or its original meaning language. Left out: the original.",
    }),
  })
  .meta({ id: "AddQuery" });
export type AddQuery = z.infer<typeof AddQuery>;

/** Lower-case words joined by hyphens, as in `everyday-estonian`. */
export const PUBLICATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Withdrawing takes no body, as it always has; the redirect rides as a query parameter. */
export const WithdrawQuery = z
  .object({
    redirectTo: z.string().min(3).max(80).regex(PUBLICATION_SLUG).optional().meta({
      description:
        "The slug of another published deck. The withdrawn deck's public page then sends visitors there with a permanent redirect.",
    }),
  })
  .meta({ id: "WithdrawQuery" });
export type WithdrawQuery = z.infer<typeof WithdrawQuery>;

/**
 * Where a deck sits on Explore: `languages` puts it on the shelf of the language it teaches, and
 * each subject is a shelf of its own, in this order. A closed list, because each subject is a
 * heading a translator writes and a visitor learns; a new shelf is a deliberate change.
 */
export const PUBLICATION_CATEGORIES = [
  "languages",
  "geography",
  "science",
  "nature",
  "arts",
  "driving",
  "citizenship",
  "technology",
  "work",
] as const;
export const PublicationCategory = z.enum(PUBLICATION_CATEGORIES);
export type PublicationCategory = z.infer<typeof PublicationCategory>;

/**
 * The tags a publisher may put on a published deck, in the order a deck page lists them. Closed
 * for the same reason as the shelves: each is a label a translator writes. Not a card's `tags`.
 */
export const PUBLICATION_TAGS = [
  "core-words",
  "conversation",
  "travel",
  "alphabet",
  "grammar",
  "beginner",
  "exam-goethe-a1",
  "exam-hsk-1",
  "exam-topik-1",
  "exam-jlpt-n5",
  "exam-leben-in-deutschland",
  "exam-us-civics",
  "exam-ccse",
  "exam-czech-citizenship",
  "exam-canadian-citizenship",
  "exam-us-dmv",
] as const;
export const PublicationTag = z.enum(PUBLICATION_TAGS);
export type PublicationTag = z.infer<typeof PublicationTag>;

/** The known keys among these, once each, in list order: a key since dropped from the list goes. */
export function publicationTags(keys: readonly string[]): PublicationTag[] {
  return PUBLICATION_TAGS.filter((key) => keys.includes(key));
}

export const PublicationInput = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(PUBLICATION_SLUG, "Use lower-case words joined by hyphens, like everyday-estonian.")
      .meta({ description: "The public URL part. Changing it breaks links already shared." }),
    summary: z.string().trim().min(1).max(500).meta({ description: "One or two plain sentences" }),
    category: PublicationCategory.nullable().optional().meta({
      description:
        "Where the deck sits in Explore: `languages` for the shelf of the deck's own language, or a subject. A deck sits on one shelf.",
    }),
    tags: z.array(PublicationTag).max(PUBLICATION_TAGS.length).optional().meta({
      description:
        "Tags from the fixed list, shown on the deck page and used to find related decks. Left out, the deck keeps the tags it has; an empty list clears them.",
    }),
    meaningLanguage: LanguageTag.meta({
      description:
        "The original edition: the language the deck's own meanings are written in. Other editions are localizations of it.",
    }),
    editionFields: z
      .array(EditionCardField)
      .min(1)
      .max(EDITION_CARD_FIELDS.length)
      .optional()
      .meta({
        description:
          "Card fields every other edition must carry before it can be published. `meaning` by default; add `term` only when the terms are not in a language being learned.",
      }),
    publisher: z.string().trim().min(1).max(80),
    sources: z
      .array(z.object({ title: z.string().trim().min(1).max(200), url: z.url().optional() }))
      .max(20)
      .default([]),
    reviewedAt: z.iso
      .date()
      .nullable()
      .optional()
      .meta({ description: "When a person last checked the whole deck" }),
    approveRecordings: z.boolean().optional().meta({
      description:
        "Approve the recordings the deck's cards hold now for its public page. A recording added or replaced later stays off the page until the deck is published again with this set; until then that card plays nothing there. You are responsible for the right to publish every recording you approve.",
    }),
  })
  .meta({ id: "PublicationInput" });
export type PublicationInput = z.infer<typeof PublicationInput>;

const SeriesName = z
  .string()
  .trim()
  .min(1, "Give the series a name.")
  .max(80, "Keep the name under 80 characters.");

/** Deck ids in the order they should run. Each deck once. */
const DeckIds = z
  .array(z.string().min(1))
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, "List each deck once.");

export const SeriesInput = z.object({
  name: SeriesName,
  deckIds: DeckIds.optional().meta({
    description: "The owner's decks to move into the new series, in order",
  }),
});
export type SeriesInput = z.infer<typeof SeriesInput>;

export const SeriesPatch = z.object({ name: SeriesName });
export type SeriesPatch = z.infer<typeof SeriesPatch>;

export const seriesLimits = {
  name: SeriesName.maxLength,
} satisfies Record<string, number | null>;

/** The series' active decks, all of them, in their new order. A full list, so a retry lands the same. */
export const SeriesDecksInput = z.object({
  deckIds: DeckIds.meta({
    description:
      "Every active deck the series should hold, in order. A deck listed from elsewhere moves in; one left out leaves the series.",
  }),
});
export type SeriesDecksInput = z.infer<typeof SeriesDecksInput>;

export const SeriesOrderInput = z.object({
  seriesIds: z
    .array(z.string().min(1))
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "List each series once.")
    .meta({ description: "Every active series, in their new order" }),
});
export type SeriesOrderInput = z.infer<typeof SeriesOrderInput>;

/** What happens to a series' active decks when it is deleted. */
export const SeriesDeleteInput = z.object({
  decks: z.enum(["archive", "keep"]).meta({
    description:
      "archive: the decks are archived, and restoring them is up to the learner. keep: they stay in Library, without a series.",
  }),
});
export type SeriesDeleteInput = z.infer<typeof SeriesDeleteInput>;

const SectionName = z
  .string()
  .trim()
  .min(1, "Give the section a name.")
  .max(80, "Keep the name under 80 characters.");

/** Card ids, each once. */
const CardIds = z
  .array(z.string().min(1))
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, "List each card once.");

export const SectionInput = z.object({
  name: SectionName,
  cardIds: CardIds.optional().meta({
    description: "Cards of the deck to move into the new section",
  }),
});
export type SectionInput = z.infer<typeof SectionInput>;

export const SectionPatch = z.object({ name: SectionName });
export type SectionPatch = z.infer<typeof SectionPatch>;

export const sectionLimits = {
  name: SectionName.maxLength,
} satisfies Record<string, number | null>;

export const SectionOrderInput = z.object({
  sectionIds: z
    .array(z.string().min(1))
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "List each section once.")
    .meta({ description: "Every active section of the deck, in the new order" }),
});
export type SectionOrderInput = z.infer<typeof SectionOrderInput>;

/** What happens to a section's active cards when it is archived. */
export const SectionArchiveInput = z.object({
  cards: z.enum(["archive", "keep"]).meta({
    description:
      "archive: the cards leave the deck and review with the section. keep: they stay in the deck, without a section.",
  }),
});
export type SectionArchiveInput = z.infer<typeof SectionArchiveInput>;

/** Put many cards of one deck in a section, or take them out of theirs. */
export const CardSectionInput = z.object({
  cardIds: CardIds.min(1, "Choose at least one card."),
  sectionId: z.string().min(1).nullable().meta({
    description: "An active section of the same deck. Null takes the cards out of theirs.",
  }),
});
export type CardSectionInput = z.infer<typeof CardSectionInput>;

/** The notes subset in one sentence, so assistants write it on purpose. `notes.ts` reads it. */
const NOTES_FORMAT =
  "Markdown subset: paragraphs, line breaks, **bold**, *italic*, ++underline++, ~~strikethrough~~, links ([text](https://example.com) or <https://example.com>, with http, https or mailto destinations), and bulleted (- item) or numbered (1. item) lists. A single line break stays a line break. Anything else, HTML included, shows as its literal text.";

/**
 * How long each field of a card may be. Enrichment bounds what a model returns by the same
 * numbers, so AI text can never be longer than the edit sheet will let the learner save.
 */
export const CARD_LIMITS = {
  term: 500,
  meaning: 2000,
  pronunciation: 200,
  example: 2000,
  notes: 2000,
  source: 200,
  // A hook is a phrase that leads back to the answer, never a paragraph.
  hook: 200,
} as const;

/** How many tags a card may carry, and how long each may be. */
export const TAG_LIMITS = { count: 20, length: 40 } as const;

const TagName = z.string().trim().min(1).max(TAG_LIMITS.length);

/** Renames a tag on one deck's cards; a name already in use merges the two. */
export const DeckTagRename = z.object({
  from: TagName.meta({ description: "The tag to rename, in any case" }),
  to: TagName.meta({
    description:
      "Its new name. One you already use, in any case, merges the two; a change of case alone respells the tag in every deck.",
  }),
});
export type DeckTagRename = z.infer<typeof DeckTagRename>;

export const DeckTagRef = z.object({ name: TagName.meta({ description: "The tag, in any case" }) });
export type DeckTagRef = z.infer<typeof DeckTagRef>;

export const CardInput = z.object({
  id: ClientId.optional(),
  deckId: z.string().min(1, "Choose a deck."),
  term: z
    .string()
    .trim()
    .min(1, "Type the term.")
    .max(CARD_LIMITS.term, "Keep the term under 500 characters."),
  meaning: z
    .string()
    .trim()
    .max(CARD_LIMITS.meaning, "Keep the meaning under 2000 characters.")
    .optional(),
  pronunciation: z.string().trim().max(CARD_LIMITS.pronunciation).optional(),
  example: z.string().trim().max(CARD_LIMITS.example).optional().meta({
    description:
      "One sentence in the term's language. Japanese carries a hiragana reading in square brackets after each run of kanji: 毎朝[まいあさ]パンを食[た]べます。",
  }),
  notes: z
    .string()
    .trim()
    .max(CARD_LIMITS.notes)
    .optional()
    .meta({ description: `${NOTES_FORMAT} The limit counts the Markdown source.` }),
  hook: z
    .string()
    .trim()
    .max(CARD_LIMITS.hook, "Keep the hook under 200 characters.")
    .optional()
    .meta({
      description:
        "A short association in the meaning language, such as a sound-alike word or a picture in the mind, that leads back to the answer without giving any of it away. Review shows it under the cue: the learner can peek at it before the reveal, which rules out Easy, or show it after.",
    }),
  language: LanguageTag.nullable().optional(),
  tags: z
    .array(z.string().trim().min(1).max(TAG_LIMITS.length))
    .max(TAG_LIMITS.count)
    .optional()
    .meta({
      description:
        "Replaces the card's tags. A name you already use, in any case, is saved in your spelling, and the same name twice is kept once.",
    }),
  source: z.string().trim().max(CARD_LIMITS.source).optional(),
  directions: Directions.nullable()
    .optional()
    .meta({ description: "Legacy form of `reviewModes`. Null follows the deck." }),
  reviewModes: ReviewModes.nullable()
    .optional()
    .meta({ description: "Overrides the deck's review modes. Null follows the deck." }),
  meaningSource: StatedFieldSource.optional(),
  exampleSource: StatedFieldSource.optional(),
  pronunciationSource: StatedFieldSource.optional(),
  notesSource: StatedFieldSource.optional(),
  hookSource: StatedFieldSource.optional(),
  sectionId: z.string().min(1).nullable().optional().meta({
    description:
      "An active section of the card's deck. Null or left out: no section. Moving a card to another deck clears it.",
  }),
  enrich: z.boolean().optional().meta({
    description:
      "Let AI fill the empty fields the deck's enrichFields allow, and the language, after the add. It fills those that suit the card and the deck's own cards. Off by default for API keys and MCP clients; on for the learner in the app.",
  }),
});
export type CardInput = z.infer<typeof CardInput>;

export const DeckChoiceInput = z.object({
  term: z.string().trim().min(1, "Type the term.").max(CARD_LIMITS.term),
  source: z
    .string()
    .trim()
    .max(CARD_LIMITS.source)
    .optional()
    .meta({ description: "Where the term was found, such as a page's title" }),
});
export type DeckChoiceInput = z.infer<typeof DeckChoiceInput>;

/**
 * How long each of a card's text fields may be, read off `CardInput` itself. A form caps and counts
 * from here, so the limit a learner sees can never drift from the one the route refuses.
 */
export const cardLimits = {
  term: CardInput.shape.term.maxLength,
  meaning: CardInput.shape.meaning.unwrap().maxLength,
  pronunciation: CardInput.shape.pronunciation.unwrap().maxLength,
  example: CardInput.shape.example.unwrap().maxLength,
  notes: CardInput.shape.notes.unwrap().maxLength,
  source: CardInput.shape.source.unwrap().maxLength,
  hook: CardInput.shape.hook.unwrap().maxLength,
} satisfies Record<string, number | null>;

/** A learner's own answer to a Smart add question, checked against the terms on the list. */
export const LessonAnswerInput = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(300),
  terms: z
    .array(
      z.object({ id: z.string().max(40), term: z.string().max(500), gloss: z.string().max(2000) }),
    )
    .min(1)
    .max(200),
});
export type LessonAnswerInput = z.infer<typeof LessonAnswerInput>;

/** A batch add. A lesson is 20 to 40 terms; one call, not one per term. */
export const CardsInput = z.object({
  cards: z
    .array(CardInput)
    .min(1)
    .max(200)
    .refine((cards) => {
      const ids = cards.flatMap((card) => (card.id ? [card.id] : []));
      return new Set(ids).size === ids.length;
    }, "Give each card its own id."),
});
export type CardsInput = z.infer<typeof CardsInput>;

/** A page of Activity: where to carry on from, and how many audit rows to read. */
export const ActivityQuery = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ActivityQuery = z.infer<typeof ActivityQuery>;

export const CardPatch = CardInput.partial()
  .omit({ id: true, deckId: true, enrich: true })
  .extend({
    deckId: z.string().min(1).optional(),
  });
export type CardPatch = z.infer<typeof CardPatch>;

export const CardImportanceInput = z
  .object({
    important: z.boolean().meta({
      description: "Whether the card is important to you. Your own mark: nobody else sees it.",
    }),
  })
  .meta({ id: "CardImportance" });
export type CardImportanceInput = z.infer<typeof CardImportanceInput>;

/** A bulk change to important marks: each card with the mark it should have. */
export const CardImportancesInput = z
  .object({
    cards: z
      .array(CardImportanceInput.extend({ cardId: z.string().min(1) }))
      .min(1, "Choose at least one card.")
      .max(200)
      .refine(
        (marks) => new Set(marks.map((mark) => mark.cardId)).size === marks.length,
        "List each card once.",
      ),
  })
  .meta({ id: "CardImportances" });
export type CardImportancesInput = z.infer<typeof CardImportancesInput>;

/** One card's edit in a bulk edit: which card, and the fields to change on it. */
export const CardEditInput = CardPatch.extend({ cardId: z.string().min(1) });
export type CardEditInput = z.infer<typeof CardEditInput>;

/** A bulk edit. Each card succeeds or fails on its own. */
export const CardEditsInput = z.object({
  cards: z
    .array(CardEditInput)
    .min(1)
    .max(200)
    .refine(
      (edits) => new Set(edits.map((edit) => edit.cardId)).size === edits.length,
      "List each card once.",
    ),
});
export type CardEditsInput = z.infer<typeof CardEditsInput>;

/** A bulk archive or restore. Each card succeeds or fails on its own. */
export const CardArchiveInput = z.object({
  cardIds: CardIds.min(1, "Choose at least one card.").max(200),
});
export type CardArchiveInput = z.infer<typeof CardArchiveInput>;

/** How much a card write sends back: every card in full, or only each card's id and status. */
export const ResponseShape = z.enum(["full", "terse"]).meta({
  description:
    "full, the default, returns each card. terse returns only each card's id and status, an add's enrichmentStatus, and an error's code and message.",
});
export type ResponseShape = z.infer<typeof ResponseShape>;

export const ResponseShapeQuery = z.object({ response: ResponseShape.optional() });

/**
 * What helped a recall before the reveal, in the order review offers them, so a later step such as
 * a hint joins the end. Easy means recall without help, so no aided grade may be Easy.
 */
export const REVIEW_AIDS = ["hook"] as const;
export const ReviewAid = z.enum(REVIEW_AIDS).meta({
  id: "ReviewAid",
  description: "hook: the learner peeked at the card's memory hook before the reveal.",
});
export type ReviewAid = z.infer<typeof ReviewAid>;

/** Whether a grade may follow what the learner used before the reveal: every grade but an aided Easy. */
export const gradeAllowed = (rating: number, aid: ReviewAid | null | undefined) =>
  !aid || rating !== FsrsRating.Easy;

/** Easy on a mode already graded today counts as Good: a second try is no sign of ease, ADR 0031. */
export const countedRating = (rating: Rating, repeat: boolean): Rating =>
  repeat && rating === FsrsRating.Easy ? FsrsRating.Good : rating;

/** Longer than this in the foreground, a recall or grade time no longer measures thinking, so it is unknown. */
export const REVIEW_TIME_LIMIT_MS = 10 * 60_000;
const ReviewTime = z.number().int().min(0).max(REVIEW_TIME_LIMIT_MS);

/**
 * One grade names its review mode. `direction` is the form grades took before review modes,
 * still accepted so an older app or a queued offline grade replays onto the same schedule.
 */
export const GradeInput = z
  .object({
    cardId: z.string().min(1),
    mode: ReviewMode.optional(),
    direction: Direction.optional().meta({
      description: "Legacy. recognition is term → meaning and production is meaning → term.",
    }),
    rating: Rating,
    /** Client time of the review, so offline grades keep their real timestamp. */
    reviewedAt: z.coerce.date().optional(),
    /** The device zone, used only to set the review zone the first time one is reported. */
    timezone: z.string().max(64).optional(),
    aid: ReviewAid.optional().meta({
      description: "What the learner used before the reveal. Left out, the recall was unaided.",
    }),
    recallMs: ReviewTime.optional().meta({
      description:
        "Milliseconds the cue was on screen in the foreground before the reveal, or before the grade when there was no reveal. Left out when unknown or over 10 minutes.",
    }),
    gradeMs: ReviewTime.optional().meta({
      description:
        "Milliseconds the answer was on screen in the foreground before the grade. Left out when unknown, over 10 minutes or with no reveal.",
    }),
    readingsFaded: z.number().int().min(0).max(500).optional().meta({
      description:
        "How many of the example's readings the answer drew faded, over words the learner knows. Left out when the example drew no reading.",
    }),
  })
  .refine((grade) => grade.mode || grade.direction, {
    message: "Say which review mode was graded.",
    path: ["mode"],
  })
  .refine((grade) => gradeAllowed(grade.rating, grade.aid), {
    message: "Easy means recall without help, so a grade with an aid cannot be Easy.",
    path: ["rating"],
  });
export type GradeInput = z.infer<typeof GradeInput>;

/** What a picture shows, for a screen reader and when it cannot load, never naming the answer. */
export const ImageDescription = z
  .string()
  .trim()
  .min(1, "Describe the picture.")
  .max(300, "Keep the description under 300 characters.");

/** A picture description's limit, read off `ImageDescription` the way `cardLimits` reads a card's. */
export const imageLimits = { description: ImageDescription.maxLength } satisfies Record<
  string,
  number | null
>;

/** The card's `imageVersion` as last read, so a newer change makes the write a 409; null expects no picture yet. */
const ImageVersion = z
  .string()
  .max(64)
  .nullable()
  .optional()
  .meta({ description: "The card's `imageVersion` as last read. Omit to skip the check." });

export const CardImageImportInput = z.object({
  url: z
    .url({ protocol: /^https?$/, error: "Use a public http or https link to a picture." })
    .max(2048),
  description: ImageDescription.optional(),
  version: ImageVersion,
});
export type CardImageImportInput = z.infer<typeof CardImageImportInput>;

/** An upload's form fields; the file itself is checked by its bytes. */
export const CardImageUploadFields = z.object({
  description: ImageDescription.optional(),
  version: ImageVersion,
});

export const CardImagePatch = z.object({
  description: ImageDescription.nullable(),
  version: ImageVersion,
});
export type CardImagePatch = z.infer<typeof CardImagePatch>;

export const CardImageVersionInput = z.object({ version: ImageVersion });
export type CardImageVersionInput = z.infer<typeof CardImageVersionInput>;

/** The languages the interface exists in. Closed so a stored value always has a catalog. */
export const AppLanguage = z.enum(["en", "uk", "ru"]);
export type AppLanguage = z.infer<typeof AppLanguage>;

export const DEFAULT_DAILY_GOAL = 50;
export const DAILY_GOAL_PRESETS = [10, 25, 50, 100] as const;

/** Recall attempts that satisfy a day's streak goal. Every accepted, non-undone grade is one. */
export const DailyGoal = z
  .number({ error: "Type a number of reviews." })
  .int("Use a whole number of reviews.")
  .min(1, "A goal is at least one review.")
  .max(200, "Keep the goal to 200 reviews or fewer.");
export type DailyGoal = z.infer<typeof DailyGoal>;

/** The goal a learner starts with when they skip choosing one while getting set up. */
export const STARTING_DAILY_GOAL = 25;

/** What a learner said they are learning when they got set up; it chooses the ready-made decks offered. */
export const LEARNING_KINDS = ["language", "test", "subject", "other"] as const;
export const LearningKind = z.enum(LEARNING_KINDS);
export type LearningKind = z.infer<typeof LearningKind>;

/** The answers from getting set up. Every field null is a skip. */
export const OnboardingInput = z.object({
  learningKind: LearningKind.nullable(),
  /** A BCP 47 tag, or the name the learner typed for a language Lymi does not list. */
  learningLanguage: z.string().trim().min(1).max(60).nullable(),
  dailyGoal: DailyGoal.nullable(),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;
export const ANALYTICS_CONSENT_VERSION = 1;
export const AnalyticsConsentInput = z.object({
  allowed: z.boolean(),
  version: z.literal(ANALYTICS_CONSENT_VERSION),
  updated_at: z.number().int().positive(),
});
export type AnalyticsConsentInput = z.infer<typeof AnalyticsConsentInput>;

/** The learner's name, as the app shows it. */
export const NameInput = z.object({
  name: z.string().trim().min(1, "Write your name.").max(80, "Keep your name under 80 characters."),
});
export type NameInput = z.infer<typeof NameInput>;

/** Proof that the learner means to delete their account: the emailed code, or a fresh Sign in with Apple. */
export const AccountDeletionInput = z.union([
  z.object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from the email."),
  }),
  z.object({
    apple: z.object({
      idToken: z.string().min(1),
      /** The raw nonce the phone hashed into the Apple request. */
      nonce: z.string().min(1),
      /** Apple's one-use code, which the server trades for a token to revoke. */
      authorizationCode: z.string().min(1).optional(),
    }),
  }),
]);
export type AccountDeletionInput = z.infer<typeof AccountDeletionInput>;

export const SettingsPatch = z.object({
  /** The language of the interface and reminders. Meanings follow it. */
  appLanguage: AppLanguage.optional(),
  dailyGoal: DailyGoal.optional(),
});
export type SettingsPatch = z.infer<typeof SettingsPatch>;

/** Takes one attempt back: its count, and the card state it replaced. */
export const UndoInput = z.object({ reviewId: z.string().min(1) });
export type UndoInput = z.infer<typeof UndoInput>;

/** The most cards one narrowed draw names, a deck's worth however large. */
export const DRAW_CARDS_MAX = 10_000;

/** `POST /api/review/draw`: the draw over chosen cards, such as the cards a deck's filters show. */
export const DrawInput = z
  .object({
    cards: z.array(z.string().min(1).max(64)).max(DRAW_CARDS_MAX).meta({
      description: "Only these cards are drawn from; today's log still covers every scope.",
    }),
    deck: z.string().optional().meta({ description: "Limit the cards to one deck" }),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .meta({ description: "Cards from the front of the order. Default 100" }),
    tz: z
      .string()
      .max(64)
      .optional()
      .meta({ description: "IANA timezone, used only until a review zone is known" }),
  })
  .meta({ id: "DrawInput" });
export type DrawInput = z.infer<typeof DrawInput>;

/** Daily reminders run on quarter-hour boundaries so one shared cron can deliver them. */
export const ReminderTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Choose a time on a 15-minute boundary");
export type ReminderTime = z.infer<typeof ReminderTime>;

const PushEndpoint = z
  .url()
  .max(4096)
  .refine((value) => value.startsWith("https://"), "Push endpoint must use HTTPS");

const PushKey = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);

export const TimeZone = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone such as Europe/Tallinn");

/** A visible page reporting its device zone. Moves the review day only while the mode is automatic. */
export const DeviceTimezoneInput = z.object({ timezone: TimeZone });
export type DeviceTimezoneInput = z.infer<typeof DeviceTimezoneInput>;

/** Settings: follow the device, or keep one zone until the learner returns to automatic. */
export const ReviewTimezoneInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("automatic") }),
  z.object({ mode: z.literal("manual"), timezone: TimeZone }),
]);
export type ReviewTimezoneInput = z.infer<typeof ReviewTimezoneInput>;

/** One browser installation. Push endpoints are capabilities and never appear in responses. */
export const PushSubscriptionInput = z.object({
  endpoint: PushEndpoint,
  expirationTime: z.number().int().nonnegative().max(8_640_000_000_000_000).nullable(),
  keys: z.object({ p256dh: PushKey, auth: PushKey }),
  reminderTime: ReminderTime,
  timezone: TimeZone,
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInput>;

export const PushEndpointInput = z.object({ endpoint: PushEndpoint });
export type PushEndpointInput = z.infer<typeof PushEndpointInput>;

export const ApiKeyInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the key, so you know which one to revoke later.")
    .max(32, "Keep the name under 32 characters."),
  scope: Scope,
});
export type ApiKeyInput = z.infer<typeof ApiKeyInput>;

export const apiKeyLimits = {
  name: ApiKeyInput.shape.name.maxLength,
} satisfies Record<string, number | null>;
