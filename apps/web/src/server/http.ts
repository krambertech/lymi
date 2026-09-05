import type { Context } from "hono";
import type { ZodType } from "zod";
import type { AppEnv } from "./index";
import { type ServiceContext, ServiceError } from "./services/context";

/** Build the service context for the caller of this request. */
export function ctxOf(c: Context<AppEnv>): ServiceContext {
  return { db: c.get("db"), userId: c.get("user").id, actor: c.get("actor") };
}

/** Parse a JSON body against a schema, or throw an `invalid` ServiceError the error handler maps to 400. */
export async function parseBody<T>(
  c: Context<AppEnv>,
  schema: ZodType<T>,
  what: string,
): Promise<T> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new ServiceError("invalid", `Invalid ${what}`, [{ message: "Body is not JSON" }]);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ServiceError("invalid", `Invalid ${what}`, parsed.error.issues);
  return parsed.data;
}

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
