import type { Actor } from "@lymi/core";
import type { Db } from "../db";

/**
 * Everything a service function needs to act for one learner. Routes build it from the
 * session or API key, MCP tools from the OAuth token, background jobs from the row they
 * are working on. `actor` goes into every audit row and onto every card the call creates.
 */
export interface ServiceContext {
  db: Db;
  userId: string;
  actor: Actor;
}

/** A failure the caller turns into an HTTP status or a tool error. */
export class ServiceError extends Error {
  constructor(
    public readonly code: "not_found" | "invalid" | "forbidden" | "conflict",
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
