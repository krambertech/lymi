import type { Actor } from "@lymi/core";
import type { Db } from "../db";
import type { AnalyticsWriter } from "./analytics";

/**
 * Everything a service function needs to act for one learner. Routes build it from the
 * session or API key, MCP tools from the OAuth token, background jobs from the row they
 * are working on. `actor` goes into every audit row and onto every card the call creates.
 */
export interface ServiceContext {
  db: Db;
  userId: string;
  actor: Actor;
  analytics?: AnalyticsWriter | undefined;
  /** Which OAuth client or API key is calling, so Activity can name the app that wrote. */
  client?: string | undefined;
  /** What that caller is called, kept on the row so a revoked key stays named in the log. */
  clientName?: string | undefined;
}

/** A failure the caller turns into an HTTP status or a tool error. */
export class ServiceError extends Error {
  constructor(
    public readonly code: "not_found" | "invalid" | "forbidden" | "conflict" | "unavailable",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function notFound(what: string): ServiceError {
  return new ServiceError("not_found", `${what} not found`);
}
