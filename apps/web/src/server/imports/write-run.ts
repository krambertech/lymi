import {
  attachImportPictures,
  finishImport,
  type ImportResume,
  type ImportRunParams,
  ownedImport,
  PICTURES_PER_STEP,
  prepareImportDecks,
  writeImportChunk,
} from "../services";
import type { ServiceContext } from "../services/context";
import type { CallBudget } from "./call-budget";

/**
 * Steps one write run takes before it hands over to a new run. Lymi is on Cloudflare's paid
 * plan, which caps an instance at 10,000 steps; a collection with many pictures can pass that,
 * so a run stops short and the next run starts where it stopped.
 */
export const STEPS_PER_RUN = 9000;

/**
 * What a write run does next. It hands over while it has room left for the hand-over and a failure
 * step, and for a next step that costs twice the calls of its costliest write step so far.
 */
export function nextWriteStep(
  state: {
    chunk: number;
    chunks: number;
    pending: number;
    steps: number;
    calls: number;
    costliest: number;
  },
  limits: { steps: number; calls: number },
): "pictures" | "cards" | "finish" | "hand over" {
  if (state.pending === 0 && state.chunk >= state.chunks) return "finish";
  if (state.steps + 2 >= limits.steps) return "hand over";
  // A run that has written nothing has no cost to go by, and always writes once before handing over.
  if (state.costliest > 0 && state.calls + 2 * state.costliest >= limits.calls) return "hand over";
  return state.pending > 0 ? "pictures" : "cards";
}

/** What a write run reaches through its Workflow instance. */
export interface WriteRun {
  ctx: ServiceContext;
  uploads: R2Bucket;
  storage: Parameters<typeof attachImportPictures>[4];
  /** Counts the calls sent through `ctx.db`, `uploads` and `storage`. */
  budget: CallBudget;
  /** Runs `work` as a durable step; a replayed instance gets back what the step returned. */
  step: <T>(name: string, work: () => Promise<T>) => Promise<T>;
  /** Starts the run that carries on from `resume`; starting the same hand-over twice starts one. */
  handOver: (resume: ImportResume) => Promise<void>;
}

type Recorded<T> = { result: T; calls: number };

/** A step recorded by a run deployed before calls were kept returns its bare result. */
function recorded<T>(out: Recorded<T> | T): Recorded<T> {
  return out && typeof out === "object" && "result" in out && typeof out.calls === "number"
    ? (out as Recorded<T>)
    : { result: out as T, calls: 0 };
}

/**
 * Writes a confirmed import chunk by chunk, each chunk and each batch of pictures one step, from
 * where `params.resume` left off. Each step records the calls it made, so a replayed instance
 * makes the same hand-over decisions it made the first time.
 */
export async function writeImport(
  params: ImportRunParams,
  run: WriteRun,
): Promise<"done" | "handed over"> {
  const { ctx, uploads, storage, budget, step } = run;
  const id = params.importId;
  const limits = { steps: STEPS_PER_RUN, calls: budget.limit - budget.reserve };
  let steps = 0;
  let calls = 0;
  let costliest = 0;
  const counted = async <T>(name: string, work: () => Promise<T>, writes = false) => {
    steps++;
    // Taken outside the step, so a step's calls include those of its failed attempts.
    const before = budget.used;
    const out = recorded<T>(
      await step(name, async () => ({ result: await work(), calls: budget.used - before })),
    );
    calls += out.calls;
    if (writes) costliest = Math.max(costliest, out.calls);
    return out.result;
  };

  const decks = await counted("decks", () => prepareImportDecks(ctx, id, uploads));
  const chunks = await counted("chunks", async () => (await ownedImport(ctx, id)).chunks);
  const resumed = params.resume;
  const runNumber = resumed ? (resumed.run ?? 2) : 1;
  const pictures = {
    stored: resumed?.pictures.stored ?? 0,
    skipped: resumed?.pictures.skipped ?? 0,
    recordings: { ...(resumed?.pictures.recordings ?? { stored: 0, skipped: 0 }) },
  };
  let chunk = resumed?.chunk ?? 0;
  let pending = resumed?.pending ?? [];
  let handled = resumed?.handled ?? 0;

  for (;;) {
    const next = nextWriteStep(
      { chunk, chunks, pending: pending.length, steps, calls, costliest },
      limits,
    );
    if (next === "finish") break;
    if (next === "hand over") {
      const resume = { chunk, pending, pictures, handled, run: runNumber + 1 };
      await counted("hand over", () => run.handOver(resume));
      return "handed over";
    }
    if (next === "pictures") {
      const batch = pending.slice(0, PICTURES_PER_STEP);
      const after = handled + batch.length;
      const done = await counted(
        `pictures ${chunk} ${pending.length}`,
        () => attachImportPictures(ctx, id, batch, uploads, storage, after),
        true,
      );
      handled = after;
      pictures.stored += done.stored;
      pictures.skipped += done.skipped;
      pictures.recordings.stored += done.recordings.stored;
      pictures.recordings.skipped += done.recordings.skipped;
      pending = pending.slice(PICTURES_PER_STEP);
      continue;
    }
    const written = await counted(
      `cards ${chunk}`,
      () => writeImportChunk(ctx, id, chunk, decks, uploads),
      true,
    );
    pending = written.pictures;
    chunk++;
  }
  await step("finish", () => finishImport(ctx, id, pictures, uploads, runNumber));
  return "done";
}
