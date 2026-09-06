import { ErrorOut } from "@lymi/core";
import type { Context, MiddlewareHandler, ValidationTargets } from "hono";
import {
  type DescribeRouteOptions,
  describeRoute,
  resolver,
  uniqueSymbol,
  validator,
} from "hono-openapi";
import type { ZodType } from "zod";
import type { AppEnv } from "./index";
import { requireLearner, requireScopeForWrites } from "./principal";
import { type ServiceContext, ServiceError } from "./services/context";

/** Build the service context for the caller of this request. */
export function ctxOf(c: Context<AppEnv>): ServiceContext {
  return { db: c.get("db"), userId: c.get("user").id, actor: c.get("actor") };
}

/**
 * Validate a request part and document it. A failure throws an `invalid` ServiceError so
 * every 400 in the API has the same shape: `{ error, issues }`.
 *
 * `body()` also insists on `content-type: application/json`. Hono's validator would
 * otherwise treat a body sent with another content type (curl's default form encoding, for
 * one) as `{}`, which a PATCH accepts and turns into a silent no-op.
 */
export function body<T extends ZodType>(schema: T, what: string) {
  const validate = validated("json", schema, what);
  // The validator's type carries the parsed-body shape for c.req.valid(); to call it here it
  // is enough that it is a middleware.
  const run = validate as unknown as MiddlewareHandler<AppEnv>;
  const checked: MiddlewareHandler<AppEnv> = async (c, next) => {
    const type = c.req.header("content-type") ?? "";
    if (!/^application\/json\b/i.test(type)) {
      throw new ServiceError("invalid", `Invalid ${what}`, [
        { message: "Send a JSON body with content-type: application/json" },
      ]);
    }
    return run(c, next);
  };
  // hono-openapi finds the request schema through this symbol on the middleware. Carry it
  // over so the wrapper documents the body the same way the bare validator would.
  return Object.assign(checked, { [uniqueSymbol]: specOf(validate) }) as typeof validate;
}
export function query<T extends ZodType>(schema: T, what: string) {
  return validated("query", schema, what);
}

function validated<T extends ZodType>(target: keyof ValidationTargets, schema: T, what: string) {
  return validator(target, schema, (result: { success: boolean; error?: unknown }) => {
    if (!result.success) throw new ServiceError("invalid", `Invalid ${what}`, result.error);
  });
}

function specOf(middleware: object): unknown {
  return (middleware as Record<symbol, unknown>)[uniqueSymbol];
}

type Responses = NonNullable<DescribeRouteOptions["responses"]>;
type Ok = { status?: number; schema: ZodType; description: string };

/**
 * Describe a route for the OpenAPI document and enforce who may call it, from one
 * declaration so the two cannot disagree.
 *
 * Access: a GET or HEAD needs any credential; anything else needs the write scope;
 * `learnerOnly` routes need the learner's own session, whatever a key's scope. The learner
 * check runs first so a read key on a learner-only route is not told a write key would help.
 * `open` routes are for callers with no credential at all, such as the waiting list behind
 * the landing page. They are mounted above `authenticate`, so they carry no scope to check
 * and must say so here rather than silently failing the write guard.
 *
 * Responses: `ok` is one or several success bodies. 401 and 429 come from authentication and
 * are added to every route; 403 is added for writes (via `defaultOptions` in openapi.ts)
 * and for learner-only routes. Routes list only what their own service throws.
 */
export function describe(
  spec: Omit<DescribeRouteOptions, "responses" | "security"> & {
    ok?: Ok | Ok[] | undefined;
    errors?: (400 | 404 | 409 | 503)[] | undefined;
    learnerOnly?: boolean | undefined;
    /** Callable with no session, key or token. Mount these above `authenticate`. */
    open?: boolean | undefined;
  },
) {
  const { ok, errors = [], learnerOnly = false, open = false, ...rest } = spec;
  const responses: Responses = {};
  const successes = ok === undefined ? [] : Array.isArray(ok) ? ok : [ok];
  for (const success of successes) {
    responses[String(success.status ?? 200)] = {
      description: success.description,
      content: { "application/json": { schema: resolver(success.schema) } },
    };
  }
  for (const status of open ? errors : [401 as const, 429 as const, ...errors]) {
    responses[String(status)] = errorResponse(status);
  }
  if (learnerOnly) responses["403"] = errorResponse(403);

  const documented = describeRoute({
    ...rest,
    ...(learnerOnly ? { security: [{ session: [] }] } : {}),
    ...(open ? { security: [] } : {}),
    responses,
  });
  // A fresh function per route: the spec is attached to it, so sharing one would share specs.
  const guarded: MiddlewareHandler<AppEnv> = (c, next) => {
    if (open) return next();
    return learnerOnly ? requireLearner(c, next) : requireScopeForWrites(c, next);
  };
  return Object.assign(guarded, { [uniqueSymbol]: specOf(documented) });
}

export function errorResponse(status: keyof typeof ERRORS) {
  return {
    description: ERRORS[status],
    content: { "application/json": { schema: resolver(ErrorOut) } },
  };
}

const ERRORS = {
  400: "The body or query did not validate. `issues` lists what failed.",
  401: "No session, API key or token, or one that is not valid.",
  403: "The caller may not do this: a read key on a write, or a key or token on a learner-only route.",
  404: "Not found, or not yours.",
  409: "The change would collide with another card.",
  429: "The key is over its rate limit.",
  503: "This capability is not configured or temporarily unavailable.",
} as const;

export function statusOf(err: ServiceError): 400 | 403 | 404 | 409 | 503 {
  switch (err.code) {
    case "invalid":
      return 400;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "unavailable":
      return 503;
    default: {
      const _exhaustive: never = err.code;
      return _exhaustive;
    }
  }
}
