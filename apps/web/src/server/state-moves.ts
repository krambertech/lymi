import {
  and,
  eq,
  inArray,
  isNull,
  or,
  type QueryBuilder,
  type SQL,
  type SQLiteColumn,
  type SQLiteInsertBuilder,
  type SQLiteInsertOnConflictDoUpdateConfig,
  type SQLiteInsertSelectQueryBuilder,
  type SQLiteInsertValue,
  type SQLiteTable,
  type SQLiteUpdateBase,
  type SQLiteUpdateBuilder,
  type SQLiteUpdateSetSource,
} from "@lymi/core/db";
import type { Db } from "./db";
import { ServiceError } from "./services/context";
import type * as machines from "./state-machines";
import type { Machine } from "./state-machines";

export * from "./state-machines";

type AnyMachine = (typeof machines)[keyof typeof machines];

type StateColumns = { [M in AnyMachine as M["table"]["_"]["name"]]: M["column"] };

type StateOf<Table extends SQLiteTable> = Table["_"]["name"] extends keyof StateColumns
  ? StateColumns[Table["_"]["name"]]
  : never;

type NamesTheStatusItLeaves =
  "Move this column with moveState or moveOnConflict from state-moves.ts, which name the status it leaves";

interface StatefulUpdateBuilder<Table extends SQLiteTable> {
  set(
    values: Omit<SQLiteUpdateSetSource<Table>, StateOf<Table>> & {
      [Column in StateOf<Table>]?: NamesTheStatusItLeaves;
    },
  ): ReturnType<SQLiteUpdateBuilder<Table, "async", D1Result>["set"]>;
}

declare const namesTheStatusItLeaves: unique symbol;

type Inserted<Table extends SQLiteTable> = ReturnType<
  SQLiteInsertBuilder<Table, "async", D1Result>["values"]
>;

type MovedOnConflict<Table extends SQLiteTable> = SQLiteInsertOnConflictDoUpdateConfig<
  Inserted<Table>
> & { [namesTheStatusItLeaves]: true };

interface StatefulInsert<Table extends SQLiteTable> extends Omit<
  Inserted<Table>,
  "onConflictDoNothing" | "onConflictDoUpdate" | "returning" | "$dynamic"
> {
  onConflictDoNothing(
    ...args: Parameters<Inserted<Table>["onConflictDoNothing"]>
  ): StatefulInsert<Table>;
  onConflictDoUpdate(config: MovedOnConflict<Table>): StatefulInsert<Table>;
}

type InsertSelect<Table extends SQLiteTable> = SQLiteInsertSelectQueryBuilder<Table> | SQL;

interface StatefulInsertBuilder<Table extends SQLiteTable> {
  values(value: SQLiteInsertValue<Table>): StatefulInsert<Table>;
  values(values: SQLiteInsertValue<Table>[]): StatefulInsert<Table>;
  select(
    selectQuery: InsertSelect<Table> | ((qb: QueryBuilder) => InsertSelect<Table>),
  ): StatefulInsert<Table>;
}

export type UpdateBuilder<Table extends SQLiteTable> = [StateOf<Table>] extends [never]
  ? SQLiteUpdateBuilder<Table, "async", D1Result>
  : StatefulUpdateBuilder<Table>;

export type InsertBuilder<Table extends SQLiteTable> = [StateOf<Table>] extends [never]
  ? SQLiteInsertBuilder<Table, "async", D1Result>
  : StatefulInsertBuilder<Table>;

type Legal<M extends Machine> = M["moves"][number];
type From<M extends Machine> = Legal<M>[0];
type Froms<M extends Machine> = From<M> | readonly [From<M>, ...From<M>[]];
type Each<F> = F extends readonly unknown[] ? F[number] : F;
type Target<M extends Machine, F, To = Legal<M>[1]> = To extends unknown
  ? [F] extends [Extract<Legal<M>, readonly [unknown, To]>[0]]
    ? To
    : never
  : never;

interface Move<M extends Machine, F> {
  from: F;
  to: Target<M, Each<F>>;
  set?: Omit<SQLiteUpdateSetSource<M["table"]>, M["column"]>;
}

type Moved<Table extends SQLiteTable> = SQLiteUpdateBase<
  Table,
  "async",
  D1Result,
  undefined,
  Table["$inferSelect"],
  true
>;

export function inState<M extends Machine, const F extends Froms<M>>(machine: M, from: F): SQL {
  const columns = machine.table as unknown as Record<string, SQLiteColumn>;
  const column = columns[machine.column] as SQLiteColumn;
  const states: readonly unknown[] = Array.isArray(from) ? from : [from];
  const named = states.filter((state) => state !== null);
  return or(
    named.length > 1 ? inArray(column, named) : undefined,
    named.length === 1 ? eq(column, named[0]) : undefined,
    named.length < states.length ? isNull(column) : undefined,
  ) as SQL;
}

export function moveState<M extends Machine, const F extends Froms<M>>(
  db: Pick<Db, "update">,
  machine: M,
  move: Move<M, F> & { where: readonly [SQL, ...SQL[]] },
): Moved<M["table"]> {
  const update = db.update(machine.table) as unknown as {
    set(values: object): { where(where: SQL | undefined): { returning(): unknown } };
  };
  return update
    .set({ ...move.set, [machine.column]: move.to })
    .where(and(...move.where, inState(machine, move.from)))
    .returning() as Moved<M["table"]>;
}

export function moveOnConflict<M extends Machine, const F extends Froms<M>>(
  machine: M,
  move: Move<M, F> & { target: SQLiteColumn | SQLiteColumn[] },
): MovedOnConflict<M["table"]> {
  return {
    target: move.target,
    set: { ...move.set, [machine.column]: move.to },
    setWhere: inState(machine, move.from),
  } as unknown as MovedOnConflict<M["table"]>;
}

const TRIES = 4;

export async function untilMoved<T>(attempt: () => Promise<T | null>): Promise<T> {
  for (let tried = 0; tried < TRIES; tried++) {
    const moved = await attempt();
    if (moved !== null) return moved;
  }
  throw new ServiceError("unavailable", "This is being changed elsewhere. Try again.");
}
