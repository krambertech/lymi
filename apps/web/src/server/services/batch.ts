import type { Db } from "../db";

export type Statement = Parameters<Db["batch"]>[0][number];

/** Run statements as one D1 batch, and nothing when there are none. */
export async function runBatch(db: Db, statements: Statement[]) {
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

/**
 * D1 caps a batch. Whole groups go into a batch, up to about fifty statements, so a row and
 * everything that has to land with it are never split across two batches.
 */
export async function runInBatches(db: Db, groups: Statement[][]) {
  let batch: Statement[] = [];
  const flush = async () => {
    const [first, ...rest] = batch;
    if (first) await db.batch([first, ...rest]);
    batch = [];
  };
  for (const group of groups) {
    if (batch.length > 0 && batch.length + group.length > 50) await flush();
    batch.push(...group);
  }
  await flush();
}

/** Re-exported so the services keep one import for batching and slicing. */
export { selectIn } from "@lymi/core/db";
