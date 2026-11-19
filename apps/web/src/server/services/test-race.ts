import type { Db } from "../db";
import type { ServiceContext } from "./context";

type Table = Parameters<Db["update"]>[0];

/**
 * The context with its first update of `table` held back until `rival` has run, so a test can land
 * another writer between a service's read and its write.
 */
export function racedBy(
  ctx: ServiceContext,
  table: Table,
  rival: () => Promise<unknown>,
): ServiceContext {
  let raced = false;
  const late = <T extends PromiseLike<unknown>>(query: T) => ({
    // biome-ignore lint/suspicious/noThenProperty: stands in for Drizzle's thenable query
    then: (done: (value: Awaited<T>) => unknown, fail: (error: unknown) => unknown) =>
      rival()
        .then(() => query)
        .then(done as (value: unknown) => unknown, fail),
  });
  const update = ((target: Table) => {
    const builder = ctx.db.update(target);
    if (raced || target !== table) return builder;
    raced = true;
    return {
      set: (values: Parameters<typeof builder.set>[0]) => {
        const set = builder.set(values);
        return {
          where: (where: Parameters<typeof set.where>[0]) => {
            const query = set.where(where);
            return Object.assign(late(query), {
              returning: (...args: Parameters<typeof query.returning>) =>
                late(query.returning(...args)),
            });
          },
        };
      },
    };
  }) as Db["update"];
  return {
    ...ctx,
    db: new Proxy(ctx.db, {
      get: (db, key, receiver) => (key === "update" ? update : Reflect.get(db, key, receiver)),
    }),
  };
}

/**
 * The context with its first `batch` that `when` picks held back until `rival` has run, so a test
 * can land another writer between a service's read and its batched write.
 */
export function batchRacedBy(
  ctx: ServiceContext,
  rival: () => Promise<unknown>,
  when: (statements: Parameters<Db["batch"]>[0]) => boolean = () => true,
): ServiceContext {
  let raced = false;
  const batch = async (statements: Parameters<Db["batch"]>[0]) => {
    if (!raced && when(statements)) {
      raced = true;
      await rival();
    }
    return ctx.db.batch(statements);
  };
  return {
    ...ctx,
    db: new Proxy(ctx.db, {
      get: (db, key, receiver) => (key === "batch" ? batch : Reflect.get(db, key, receiver)),
    }),
  };
}

/** A Drizzle builder whose query runs only after `rival`, through whatever chain the service calls on it. */
function heldBack<T extends object>(builder: T, rival: () => Promise<unknown>): T {
  return new Proxy(builder, {
    get: (target, key, receiver) => {
      const value = Reflect.get(target, key, receiver);
      if (key === "then") {
        return (done: (value: unknown) => unknown, fail: (error: unknown) => unknown) =>
          rival()
            .then(() => (value as PromiseLike<unknown>["then"]).call(target, (v) => v))
            .then(done, fail);
      }
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const next = value.apply(target, args);
        return next && typeof next === "object" ? heldBack(next, rival) : next;
      };
    },
  });
}

/**
 * The context with its first insert into `table` held back until `rival` has run, so a test can
 * land another writer between a service's read and the row it creates.
 */
export function insertRacedBy(
  ctx: ServiceContext,
  table: Table,
  rival: () => Promise<unknown>,
): ServiceContext {
  let raced = false;
  const insert = ((target: Table) => {
    const builder = ctx.db.insert(target);
    if (raced || target !== table) return builder;
    raced = true;
    return heldBack(builder, rival);
  }) as Db["insert"];
  return {
    ...ctx,
    db: new Proxy(ctx.db, {
      get: (db, key, receiver) => (key === "insert" ? insert : Reflect.get(db, key, receiver)),
    }),
  };
}
