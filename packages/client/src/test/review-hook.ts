import {
  environmentManager,
  type FetchQueryOptions,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
  QueryObserver,
} from "@tanstack/react-query";
import { act, createElement } from "react";
import { onTestFinished, vi } from "vitest";
import type { ReviewScope } from "../api";
import { flushOutbox, resetGradeCache } from "../grades";
import { type draw, noon } from "../review-flow/review-harness";
import {
  type ReviewFlow,
  type ReviewPlatform,
  useReviewFlow,
} from "../review-flow/use-review-flow";
import { flushWrites, resetWriteCache } from "../writes";
import { configureForTest } from "./configure";
import { type RenderedHook, renderHook } from "./render-hook";

export const DRAW = "GET /api/review/draw";
export const GRADE = "POST /api/review/grade";
export const UNDO = "POST /api/review/undo";
export const ROUNDS = "GET /api/review/rounds";
export const DECKS = "GET /api/decks";
export const SECTIONS = "GET /api/decks/a/sections";
export const STREAK = "GET /api/stats/streak";
export const INSIGHTS = "GET /api/stats/insights";

type Reply = { status: number; body?: unknown };
interface Asked {
  endpoint: string;
  url: URL;
}
interface Waiting extends Asked {
  reply: (reply: Reply) => void;
}

const ok = (body: unknown): Reply => ({ status: 200, body });

class Server {
  readonly unexpected: string[] = [];
  private replies = new Map<string, Reply | "hold">();
  private asked: Asked[] = [];
  private held: Waiting[] = [];

  answers(endpoint: string, body: unknown) {
    this.replies.set(endpoint, ok(body));
  }

  refuses(endpoint: string, status: number) {
    this.replies.set(endpoint, { status });
  }

  holds(endpoint: string) {
    this.replies.set(endpoint, "hold");
  }

  release(endpoint: string, reply: Reply) {
    const at = this.held.findIndex((h) => h.endpoint === endpoint);
    const [taken] = at < 0 ? [] : this.held.splice(at, 1);
    if (!taken) throw new Error(`${endpoint} has not been asked for`);
    taken.reply(reply);
  }

  count(endpoint: string) {
    return this.asked.filter((a) => a.endpoint === endpoint).length;
  }

  last(endpoint: string): URLSearchParams | undefined {
    return this.asked.findLast((a) => a.endpoint === endpoint)?.url.searchParams;
  }

  get requests() {
    return this.asked.length;
  }

  get waiting() {
    return this.held.map((h) => h.endpoint);
  }

  fetch = async (path: string, init: RequestInit = {}) => {
    const url = new URL(path, "https://my.lymi.test");
    const endpoint = `${init.method ?? "GET"} ${url.pathname}`;
    const asked = { endpoint, url };
    this.asked.push(asked);
    const answer = this.replies.get(endpoint);
    if (!answer) {
      this.unexpected.push(endpoint);
      throw new TypeError(`no answer for ${endpoint}`);
    }
    const reply =
      answer === "hold"
        ? await new Promise<Reply>((resolve) => this.held.push({ ...asked, reply: resolve }))
        : answer;
    if (reply.status === 0) throw new TypeError("offline");
    return {
      ok: reply.status < 400,
      status: reply.status,
      json: async () => structuredClone(reply.body),
    } as Response;
  };
}

function browserLocks() {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request<T>(name: string, task: () => Promise<T>) {
      const run = (tails.get(name) ?? Promise.resolve()).then(task, task);
      tails.set(
        name,
        run.catch(() => undefined),
      );
      return run;
    },
  };
}

const PLATFORM: ReviewPlatform = {
  track: () => undefined,
  newId: () => "leg",
  onForeground: () => () => undefined,
};

class HookReview {
  readonly server = new Server();
  readonly said = new Set<string>();
  private qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  private watches: (() => void)[] = [];
  private hook: RenderedHook<ReviewFlow> | null = null;

  async open(data: ReturnType<typeof draw>, scope: ReviewScope = {}) {
    this.server.answers(DRAW, data);
    await this.mount(scope);
    if (!this.flow.current) throw new Error("no card on screen");
  }

  async mount(scope: ReviewScope = {}) {
    const { qc } = this;
    await act(async () => {
      this.hook = renderHook(
        () => useReviewFlow(scope, undefined, undefined, PLATFORM),
        ({ children }) => createElement(QueryClientProvider, { client: qc }, children),
      );
    });
    await this.settle();
  }

  get flow(): ReviewFlow {
    if (!this.hook) throw new Error("open the review first");
    return this.hook.current;
  }

  get shown() {
    return this.flow.current?.card.id;
  }

  get heading() {
    const { end } = this.flow;
    return end && end !== "unchecked" ? end.heading : end;
  }

  async tap<T>(use: (flow: ReviewFlow) => T): Promise<T> {
    await this.advance(1000);
    const { flow } = this;
    const out: T[] = [];
    await act(async () => {
      out.push(use(flow));
    });
    await this.settle();
    return out[0] as T;
  }

  grade() {
    return this.tap((flow) => gradeShown(flow));
  }

  async answer(endpoint: string, body: unknown) {
    this.server.release(endpoint, ok(body));
    await this.settle();
  }

  async refuse(endpoint: string, status: number) {
    this.server.release(endpoint, { status });
    await this.settle();
  }

  async watch<T, Data, Key extends QueryKey>(query: FetchQueryOptions<T, Error, Data, Key>) {
    this.watches.push(new QueryObserver(this.qc, query).subscribe(() => undefined));
    await this.settle();
  }

  async advance(ms: number) {
    await act(() => vi.advanceTimersByTimeAsync(ms));
    await this.settle();
  }

  async settle() {
    let before: number;
    do {
      before = this.activity;
      await act(() => vi.advanceTimersByTimeAsync(0));
    } while (this.activity !== before);
  }

  async close() {
    await this.settle();
    const left = [
      ...this.server.unexpected.map((e) => `${e} was asked for and the test gives no answer`),
      ...this.server.waiting.map((e) => `${e} still waits for an answer`),
      ...this.said,
    ];
    for (const stop of this.watches) stop();
    await act(async () => this.hook?.unmount());
    let sending = true;
    void Promise.allSettled([flushWrites(), flushOutbox()]).then(() => {
      sending = false;
    });
    await this.settle();
    if (sending) left.push("the outbox still sends");
    this.qc.clear();
    if (left.length > 0) throw new Error(`the review was left open: ${left.join("; ")}`);
  }

  private get activity() {
    return this.server.requests + (this.hook?.renders ?? 0);
  }
}

export function gradeShown(flow: ReviewFlow) {
  const { current } = flow;
  if (!current) throw new Error("no card on screen");
  return flow.grade(current, 3, {});
}

export function hookReview(): HookReview {
  environmentManager.setIsServer(() => false);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers({
    now: noon,
    toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
  });
  const review = new HookReview();
  vi.stubGlobal("fetch", review.server.fetch);
  vi.stubGlobal("navigator", { onLine: true, locks: browserLocks() });
  vi.spyOn(console, "error").mockImplementation((...said) => {
    const error = said.map(String).join(" ");
    review.said.add(
      error.includes("not wrapped in act")
        ? "the test moved the review outside tap, grade, answer, refuse and advance"
        : error,
    );
  });
  configureForTest(new Map());
  resetGradeCache();
  resetWriteCache();
  review.server.answers(DECKS, []);
  review.server.answers(ROUNDS, {});
  review.server.answers(STREAK, {
    reviewedDays: 1,
    today: { date: "2026-09-13", attempts: 0, goal: 20, outcome: "open" },
  });
  onTestFinished(async () => {
    try {
      await review.close();
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
  return review;
}
