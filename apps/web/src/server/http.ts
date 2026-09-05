import { ErrorOut } from "@lymi/core";
import type { Context, ValidationTargets } from "hono";
import { type DescribeRouteOptions, describeRoute, resolver, validator } from "hono-openapi";
import type { ZodType } from "zod";
import type { AppEnv } from "./index";
import { type ServiceContext, ServiceError } from "./services/context";

/** Build the service context for the caller of this request. */
export function ctxOf(c: Context<AppEnv>): ServiceContext {
  return { db: c.get("db"), userId: c.get("user").id, actor: c.get("actor") };
}

/**
 * Validate a request part and document it. A failure throws an `invalid` ServiceError so
 * every 400 in the API has the same shape: `{ error, issues }`.
 */
export function body<T extends ZodType>(schema: T, what: string) {
  return validate("json", schema, what);
}
export function query<T extends ZodType>(schema: T, what: string) {
  return validate("query", schema, what);
}
export function params<T extends ZodType>(schema: T, what: string) {
  return validate("param", schema, what);
}

function validate<T extends ZodType>(target: keyof ValidationTargets, schema: T, what: string) {
  return validator(target, schema, (result: { success: boolean; error?: unknown }) => {
    if (!result.success) throw new ServiceError("invalid", `Invalid ${what}`, result.error);
  });
}

type Responses = NonNullable<DescribeRouteOptions["responses"]>;

/**
 * Describe a route for the OpenAPI document. `ok` is the success body; the shared error
 * responses are added for every route so the document says what a 401 or 403 looks like.
 */
export function describe(
  spec: Omit<DescribeRouteOptions, "responses"> & {
    ok?: { status?: number; schema: ZodType; description: string } | undefined;
    errors?: (400 | 403 | 404 | 429)[] | undefined;
  },
) {
  const { ok, errors = [], ...rest } = spec;
  const responses: Responses = {};
  if (ok) {
    responses[String(ok.status ?? 200)] = {
      description: ok.description,
      content: { "application/json": { schema: resolver(ok.schema) } },
    };
  }
  const error = { content: { "application/json": { schema: resolver(ErrorOut) } } };
  responses["401"] = { description: "No session, API key or token", ...error };
  for (const status of errors)
    responses[String(status)] = { description: ERRORS[status], ...error };
  return describeRoute({ ...rest, responses });
}

const ERRORS = {
  400: "The body or query did not validate. `issues` lists what failed.",
  403: "The caller may not do this: a read key on a write, or an integration on a learner-only route.",
  404: "Not found, or not yours.",
  429: "The key is over its rate limit.",
} as const;

export function statusOf(err: ServiceError): 400 | 403 | 404 {
  switch (err.code) {
    case "invalid":
      return 400;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    default: {
      const _exhaustive: never = err.code;
      return _exhaustive;
    }
  }
}
