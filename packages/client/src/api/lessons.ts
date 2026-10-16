import type {
  LessonAccessOut,
  LessonAnswerInput,
  LessonAnswerOut,
  LessonEventOut,
  LessonReadOut,
} from "@lymi/core";
import { clientConfig } from "../config";
import { ApiError, apiUrl, failureMessage, request } from "./request";

export type LessonRead = LessonReadOut;
export type LessonTerm = LessonRead["terms"][number];
export type LessonQuestion = LessonRead["questions"][number];
export type LessonEvent = LessonEventOut;

export const lessonsApi = {
  /** The terms a learner's own answer to a question leaves off the list. */
  answerLesson: (body: LessonAnswerInput) =>
    request<LessonAnswerOut>("/api/lesson-reads/answers", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  lessonAccess: () => request<LessonAccessOut>("/api/lesson-reads/access"),
  /**
   * Photos, PDFs and pasted text in one form. Each event arrives as the model writes it, so the
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
      const body = (await res.json().catch(() => null)) as { issues?: unknown } | null;
      throw new ApiError(res.status, failureMessage(res.status, body), body?.issues);
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
