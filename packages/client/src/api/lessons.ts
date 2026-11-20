import {
  type LessonAccessOut,
  type LessonAnswerInput,
  type LessonAnswerOut,
  type LessonEventOut,
  type LessonReadOut,
  LINK_REFUSALS,
  type LinkRefusal,
} from "@lymi/core";
import { clientConfig } from "../config";
import { ApiError, apiUrl, failureMessage, refusalCode, refusalDetail, request } from "./request";

export type LessonRead = LessonReadOut;
export type LessonTerm = LessonRead["terms"][number];
export type LessonQuestion = LessonRead["questions"][number];
export type LessonEvent = LessonEventOut;

/** Why Smart add would not read the link it was given, for each app to say in its own words. */
export type LinkReadRefusal =
  | { kind: "refused"; refused: LinkRefusal; title: string | null; service: string | null }
  | { kind: "invalid" }
  | { kind: "unreadable" }
  | { kind: "too_long" }
  /** An article over 15,000 words, which counts as `reads`; `left` is null without a daily limit. */
  | { kind: "long_read"; reads: number; words: number; left: number | null };

/** A failed read as a link refusal, or null for any other failure. */
export function linkReadRefusal(error: unknown): LinkReadRefusal | null {
  const number = (key: string) => {
    const value = Number(refusalDetail(error, key));
    return Number.isFinite(value) ? value : null;
  };
  switch (refusalCode(error)) {
    case "link_refused": {
      const refused = refusalDetail(error, "refused");
      return LINK_REFUSALS.includes(refused as LinkRefusal)
        ? {
            kind: "refused",
            refused: refused as LinkRefusal,
            title: refusalDetail(error, "title"),
            service: refusalDetail(error, "service"),
          }
        : { kind: "unreadable" };
    }
    case "link_invalid":
      return { kind: "invalid" };
    case "link_unreadable":
      return { kind: "unreadable" };
    case "too_long":
      return { kind: "too_long" };
    case "long_read": {
      const reads = number("reads");
      return reads === null
        ? { kind: "unreadable" }
        : {
            kind: "long_read",
            reads,
            words: number("words") ?? 0,
            left: refusalDetail(error, "left") === null ? null : number("left"),
          };
    }
    default:
      return null;
  }
}

export const lessonsApi = {
  /** The terms a learner's own answer to a question leaves off the list. */
  answerLesson: (body: LessonAnswerInput) =>
    request<LessonAnswerOut>("/api/lesson-reads/answers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  lessonAccess: () => request<LessonAccessOut>("/api/lesson-reads/access"),
  /**
   * Photos, PDFs and pasted text in one form, or a `link` to an article on its own. Each event arrives as the model writes it, so the
   * list fills in while the pages are read. Nothing is stored.
   */
  readLesson: async (
    material: FormData,
    onEvent: (event: LessonEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const config = clientConfig();
    let res: Response;
    try {
      res = await fetch(apiUrl("/api/lesson-reads"), {
        method: "POST",
        body: material,
        headers: config.headers ? await config.headers() : {},
        credentials: config.credentials ?? "include",
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(0, config.messages.unreachable());
    }
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as {
        issues?: unknown;
        code?: string;
      } | null;
      throw new ApiError(res.status, failureMessage(res.status, body), body?.issues, body?.code);
    }
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let end = buffer.indexOf("\n");
      while (end >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        if (line) {
          const event = JSON.parse(line) as LessonEvent;
          if (event.type === "error") throw new ApiError(500, config.messages.failed());
          onEvent(event);
        }
        end = buffer.indexOf("\n");
      }
      if (done) return;
    }
  },
};
