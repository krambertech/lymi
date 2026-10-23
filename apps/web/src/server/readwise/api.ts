import { z } from "zod";

// Readwise's API with the learner's personal token; lists allow 20 calls a minute. https://readwise.io/api_deets

const BASE = "https://readwise.io/api/v2";

const Tag = z.object({ name: z.string() });

const Highlight = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  text: z.string(),
  note: z.string().nullish(),
  tags: z.array(Tag).nullish(),
  updated_at: z.string().nullish(),
  is_deleted: z.boolean().nullish(),
  is_discard: z.boolean().nullish(),
});

const ExportBook = z.object({
  user_book_id: z.union([z.number(), z.string()]).transform(String),
  title: z.string().nullish(),
  readable_title: z.string().nullish(),
  author: z.string().nullish(),
  is_deleted: z.boolean().nullish(),
  highlights: z.array(Highlight),
});

const ExportPage = z.object({
  results: z.array(ExportBook),
  nextPageCursor: z.union([z.string(), z.number()]).nullish(),
});

const ListBook = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  title: z.string().nullish(),
  author: z.string().nullish(),
  num_highlights: z.number().nullish(),
});

const ListHighlight = z.object({
  book_id: z.union([z.number(), z.string()]).transform(String),
  text: z.string(),
});

const List = <T extends z.ZodType>(item: T) => z.object({ results: z.array(item) });

export type ReadwiseHighlight = z.infer<typeof Highlight>;
export type ReadwiseExportBook = z.infer<typeof ExportBook>;
export type ReadwiseBookSummary = z.infer<typeof ListBook>;

/** Readwise turned the token down: it was revoked, mistyped or its subscription ended. */
export class ReadwiseRefused extends Error {
  constructor() {
    super("Readwise refused the token");
    this.name = "ReadwiseRefused";
  }
}

/** Over the rate limit; `retryAfter` is in seconds, from Readwise's `Retry-After`. */
export class ReadwiseLimited extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Readwise asked to wait ${retryAfter} s`);
    this.name = "ReadwiseLimited";
  }
}

export class ReadwiseUnavailable extends Error {
  constructor(status: number) {
    super(`Readwise answered ${status}`);
    this.name = "ReadwiseUnavailable";
  }
}

export interface ReadwiseApi {
  /** True for a token Readwise accepts. */
  accepts(token: string): Promise<boolean>;
  /** The learner's books and articles, newest first. */
  books(token: string): Promise<ReadwiseBookSummary[]>;
  /** Their latest highlights across every book, to tell each book's language. */
  recentHighlights(token: string): Promise<{ bookId: string; text: string }[]>;
  /** One page of highlights updated after `updatedAfter`, grouped by book. */
  exportPage(
    token: string,
    input: { updatedAfter: Date; cursor?: string | undefined },
  ): Promise<{ books: ReadwiseExportBook[]; cursor: string | null }>;
}

export function createReadwiseApi(fetcher: typeof fetch = fetch): ReadwiseApi {
  async function get(token: string, path: string): Promise<unknown> {
    const response = await fetcher(`${BASE}${path}`, {
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) throw new ReadwiseRefused();
    if (response.status === 429) {
      throw new ReadwiseLimited(Number(response.headers.get("Retry-After")) || 60);
    }
    if (!response.ok) throw new ReadwiseUnavailable(response.status);
    return response.status === 204 ? null : response.json();
  }

  return {
    async accepts(token) {
      try {
        await get(token, "/auth/");
        return true;
      } catch (error) {
        if (error instanceof ReadwiseRefused) return false;
        throw error;
      }
    },
    async books(token) {
      return List(ListBook).parse(await get(token, "/books/?page_size=1000")).results;
    },
    async recentHighlights(token) {
      const page = List(ListHighlight).parse(await get(token, "/highlights/?page_size=1000"));
      return page.results.map((h) => ({ bookId: h.book_id, text: h.text }));
    },
    async exportPage(token, { updatedAfter, cursor }) {
      const query = new URLSearchParams({ updatedAfter: updatedAfter.toISOString() });
      if (cursor) query.set("pageCursor", cursor);
      const page = ExportPage.parse(await get(token, `/export/?${query}`));
      return {
        books: page.results,
        cursor: page.nextPageCursor == null ? null : String(page.nextPageCursor),
      };
    },
  };
}
