import { clientConfig } from "../config";

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

/** A path on the product API as this app reaches it: the web's own origin, or the phone's base URL. */
export function apiUrl(path: string): string {
  return `${clientConfig().baseUrl ?? ""}${path}`;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const config = clientConfig();
  let session: Record<string, string> = {};
  try {
    if (config.headers) session = await config.headers();
  } catch {
    // An unreadable session is a signed-out one: the outboxes hold their queue for sign-in.
    throw new ApiError(401, config.messages.signIn());
  }
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      // A form body sets its own multipart boundary.
      headers: {
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...session,
        ...(init?.headers ?? {}),
      },
      credentials: config.credentials ?? "include",
    });
  } catch {
    // Status 0 is what the grade outbox reads as offline.
    throw new ApiError(0, unreachable());
  }
  if (res.status === 401) throw new ApiError(401, config.messages.signIn());
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { issues?: unknown } | null;
    throw new ApiError(res.status, failureMessage(res.status, body), body?.issues);
  }
  return (await res.json()) as T;
}

function unreachable() {
  return clientConfig().messages.unreachable();
}

/**
 * The server's `error` is English and meant for integrations, so the learner sees the app's catalog
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
  const { messages } = clientConfig();
  if (status === 403) return messages.ownerOnly();
  if (status === 404) return messages.gone();
  return messages.failed();
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
