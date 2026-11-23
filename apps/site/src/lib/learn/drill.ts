import type { MessageDescriptor } from "@lingui/core";
import type { QuizState } from "./quiz";
import { nextInTurn, type Ruled } from "./review";

export type DrillText = MessageDescriptor | { et: string };

interface Asked {
  id: string;
  rule: string;
  say: string;
  explain: MessageDescriptor;
}

export interface FormDrill extends Asked {
  kind: "form";
  base: string;
  gloss: MessageDescriptor;
  cue: DrillText;
  answers: readonly [string, ...string[]];
  means?: MessageDescriptor;
  wrong?: readonly string[];
}

export interface DrillOption {
  id: string;
  label: DrillText;
  sub?: MessageDescriptor;
}

export interface ChoiceDrill extends Asked {
  kind: "choice";
  answer: DrillOption;
  slip?: DrillOption;
  wrong: readonly DrillOption[];
}

export interface GapDrill extends Asked {
  kind: "gap";
  before: string;
  after: string;
  answer: string;
  wrong: readonly string[];
  listen: "first" | "after";
}

export type DrillItem = FormDrill | ChoiceDrill | GapDrill;

export interface DrillRule {
  label: MessageDescriptor;
  section: string;
}

export interface DrillBank {
  rules: Readonly<Record<string, DrillRule>>;
  items: readonly DrillItem[];
}

const WRONG_SHOWN = 2;

interface Offered<T> {
  answer: T;
  slip?: T | undefined;
  wrong: readonly T[];
}

export function drawOptions<T>(
  { answer, slip, wrong }: Offered<T>,
  mix: (list: readonly T[]) => T[],
): T[] {
  const sure = slip === undefined ? [] : [slip];
  return mix([answer, ...[...sure, ...mix(wrong)].slice(0, WRONG_SHOWN)]);
}

export function drillWord(item: DrillItem): string {
  switch (item.kind) {
    case "form":
      return item.answers[0];
    case "choice":
      return item.say;
    case "gap":
      return `${item.before}${item.answer}${item.after}`.trim();
  }
}

const RETURNS_AFTER = 3;
const RIGHTS_OWED = 2;

interface RunBase {
  items: readonly Ruled[];
  queue: readonly Ruled[];
  owed: Readonly<Record<string, number>>;
  first: Readonly<Record<string, boolean>>;
  turn: number;
  repeats: boolean;
}

export type DrillRun =
  | (RunBase & { status: "asking"; now: Ruled; heard: boolean })
  | (RunBase & { status: "answered"; now: Ruled; picked: string; right: boolean })
  | (RunBase & { status: "finished" });

export type DrillEvent =
  | { type: "heard" }
  | { type: "answered"; picked: string; right: boolean }
  | { type: "next" };

export interface RunStart {
  items: readonly Ruled[];
  repeats: boolean;
}

export function startRun({ items, repeats }: RunStart): DrillRun {
  const base: RunBase = { items, queue: items.slice(1), owed: {}, first: {}, turn: 0, repeats };
  const now = items[0];
  return now ? { ...base, status: "asking", now, heard: false } : { ...base, status: "finished" };
}

function nextTurn(run: Extract<DrillRun, { status: "answered" }>): DrillRun {
  const { status: _status, now, picked: _picked, right: _right, ...base } = run;
  const at = Math.min(RETURNS_AFTER, base.queue.length);
  const queue = base.owed[now.id]
    ? [...base.queue.slice(0, at), now, ...base.queue.slice(at)]
    : base.queue;
  const place = nextInTurn(queue, now);
  const next = queue[place];
  if (!next) return { ...base, status: "finished" };
  return {
    ...base,
    status: "asking",
    queue: queue.filter((_, i) => i !== place),
    turn: base.turn + 1,
    now: next,
    heard: true,
  };
}

export function drillReducer(run: DrillRun, event: DrillEvent): DrillRun {
  switch (event.type) {
    case "heard":
      return run.status === "asking" && !run.heard ? { ...run, heard: true } : run;
    case "answered": {
      if (run.status !== "asking" || !run.heard) return run;
      const { status: _status, heard: _heard, ...rest } = run;
      const { id } = run.now;
      const { right, picked } = event;
      const before = run.owed[id] ?? 0;
      const owed = right ? Math.max(0, before - 1) : run.repeats ? RIGHTS_OWED : 0;
      return {
        ...rest,
        status: "answered",
        picked,
        right,
        owed: { ...run.owed, [id]: owed },
        first: id in run.first ? run.first : { ...run.first, [id]: right },
      };
    }
    case "next":
      return run.status === "answered" ? nextTurn(run) : run;
  }
}

export function settledCount(run: DrillRun): number {
  return run.items.filter(({ id }) => id in run.first && !run.owed[id]).length;
}

export function runQuizState(run: Exclude<DrillRun, { status: "finished" }>): QuizState {
  const shared = { round: run.turn, rounds: run.items.length, results: [] };
  return run.status === "asking"
    ? { ...shared, status: "asking", heard: run.heard }
    : { ...shared, status: "answered", picked: run.picked, right: run.right };
}

export function endsWithThis(run: DrillRun): boolean {
  return run.status === "answered" && run.queue.length === 0 && !run.owed[run.now.id];
}

export interface RuleScore {
  rule: string;
  right: number;
  total: number;
}

export function ruleScores({ items, first }: Pick<RunBase, "items" | "first">): RuleScore[] {
  const scores = new Map<string, RuleScore>();
  for (const { id, rule } of items) {
    const score = scores.get(rule) ?? { rule, right: 0, total: 0 };
    scores.set(rule, {
      rule,
      right: score.right + (first[id] ? 1 : 0),
      total: score.total + 1,
    });
  }
  return [...scores.values()];
}

export type DrillSession<Source, Question> =
  | { status: "idle"; failed: boolean }
  | { status: "loading" }
  | { status: "open"; set: number; sources: readonly Source[]; questions: readonly Question[] }
  | { status: "closed" };

export type DrillSessionEvent<Source, Question> =
  | { type: "asked" }
  | { type: "loaded"; sources: readonly Source[]; questions: readonly Question[] }
  | { type: "failed" }
  | { type: "more"; questions: readonly Question[] }
  | { type: "closed" };

export function sessionReducer<Source, Question>(
  session: DrillSession<Source, Question>,
  event: DrillSessionEvent<Source, Question>,
): DrillSession<Source, Question> {
  switch (event.type) {
    case "asked":
      return session.status === "idle" ? { status: "loading" } : session;
    case "loaded": {
      if (session.status !== "loading") return session;
      const { sources, questions } = event;
      return questions.length
        ? { status: "open", set: 0, sources, questions }
        : { status: "closed" };
    }
    case "failed":
      return session.status === "loading" ? { status: "idle", failed: true } : session;
    case "more":
      return session.status === "open" && event.questions.length
        ? { ...session, set: session.set + 1, questions: event.questions }
        : session;
    case "closed":
      return { status: "closed" };
  }
}
