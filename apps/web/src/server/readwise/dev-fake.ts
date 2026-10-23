import type { ReadwiseApi, ReadwiseExportBook } from "./api";

/** The token that reaches this fake instead of Readwise, in local development and previews only. */
export const DEV_READWISE_TOKEN = "lymi-dev-readwise-0000";

type FakeBook = { id: string; title: string; author: string; highlights: [string, string?][] };

// Invented books and sentences; each highlight is [text, note].
const BOOKS: FakeBook[] = [
  {
    id: "9001",
    title: "Una stagione a Torino",
    author: "Marta Ferri",
    highlights: [
      ["sbadigliare"],
      ["di sfuggita"],
      ["La pioggia batteva sui vetri della cucina.", ".lymi vetri"],
      ["Mi guardò e tornò al suo caffè, come se niente fosse successo quella mattina."],
    ],
  },
  {
    id: "9002",
    title: "Sügisene linn",
    author: "Mari Kask",
    highlights: [["aknaklaas"], ["Ta jõi kohvi ja vaatas, kuidas vihm vastu aknaklaasi peksis."]],
  },
  {
    id: "9003",
    title: "The Long Walk Home",
    author: "Ann Webb",
    highlights: [["Everything we need is already here, if we slow down enough to see it."]],
  },
];

/** Every highlight looks a minute old, so each pull sees them all and only external ids stop repeats. */
export function createFakeReadwiseApi(): ReadwiseApi {
  const updated = () => new Date(Date.now() - 60_000).toISOString();
  return {
    accepts: async (token) => token === DEV_READWISE_TOKEN,
    books: async () =>
      BOOKS.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        num_highlights: b.highlights.length,
      })),
    recentHighlights: async () =>
      BOOKS.flatMap((b) => b.highlights.map(([text]) => ({ bookId: b.id, text }))),
    exportPage: async () => ({
      books: BOOKS.map(
        (b): ReadwiseExportBook => ({
          user_book_id: b.id,
          title: b.title,
          readable_title: b.title,
          author: b.author,
          is_deleted: false,
          highlights: b.highlights.map(([text, note], i) => ({
            id: `${b.id}${i}`,
            text,
            note: note ?? null,
            tags: note ? [{ name: "lymi" }] : [],
            updated_at: updated(),
            is_deleted: false,
            is_discard: false,
          })),
        }),
      ),
      cursor: null,
    }),
  };
}
