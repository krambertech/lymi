import type { Db } from "../db";

export type Statement = Parameters<Db["batch"]>[0][number];

/** Run statements as one D1 batch, and nothing when there are none. */
export async function runBatch(db: Db, statements: Statement[]) {
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

/** D1 allows 100 bound parameters per query, so `IN (...)` lists are read in slices of 90. */
export async function selectIn<T, R>(
  values: readonly T[],
  select: (slice: T[]) => Promise<R[]>,
): Promise<R[]> {
  const rows: R[] = [];
  for (let i = 0; i < values.length; i += 90) rows.push(...(await select(values.slice(i, i + 90))));
  return rows;
}
