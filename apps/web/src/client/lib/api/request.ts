import { t } from "@lingui/core/macro";
import { LIVE_TAB_HEADER } from "@lymi/core";
import { tabId } from "../live";

/** The device's IANA zone. The server decides whether it moves the review day. */
export function deviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** The server's `issues`: a schema's problems, or a service's reason for refusing. */
    public issues?: unknown,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      // A form body sets its own multipart boundary.
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        [LIVE_TAB_HEADER]: tabId,
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });
  } catch {
    // Status 0 is what the grade outbox reads as offline.
    throw new ApiError(0, unreachable());
  }
  if (res.status === 401) throw new ApiError(401, t`Sign in to continue.`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { issues?: unknown } | null;
    throw new ApiError(res.status, failureMessage(res.status, body), body?.issues);
  }
  return (await res.json()) as T;
}

function unreachable() {
  return t`Couldn’t reach Lymi. Check your connection and try again.`;
}

/**
 * The server's `error` is English and meant for integrations, so the learner sees a catalog
 * sentence instead; a 400 keeps the schema's own message, which is written for a person.
 */
function failureMessage(status: number, body: { issues?: unknown } | null): string {
  if (status === 400) {
    const issue: unknown = Array.isArray(body?.issues) ? body.issues[0] : undefined;
    if (issue && typeof issue === "object" && "message" in issue) {
      if (typeof issue.message === "string" && issue.message) return issue.message;
    }
  }
  if (status >= 500) return unreachable();
  if (status === 403) return t`Only the deck’s owner can change this.`;
  if (status === 404) return t`That’s no longer here. Reload to see what changed.`;
  return t`That didn’t go through. Reload and try again.`;
}

/** The sentence to show for a failed request, whatever was thrown. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : unreachable();
}

/** One string the server attached to its refusal, such as why, or whom a link was for. */
export function refusalDetail(error: unknown, key: string): string | null {
  const issues =
    error instanceof ApiError ? (error.issues as Record<string, unknown> | null) : null;
  const value = issues?.[key];
  return typeof value === "string" && value ? value : null;
}
