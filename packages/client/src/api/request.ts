import { UpdateRequiredOut } from "@lymi/core";
import { clientConfig } from "../config";
import { requireUpdate } from "../update-required";

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
    /** The server's stable name for a refusal, such as `code_wrong`. */
    public code?: string,
  ) {
    super(message);
  }
}

/** A request the network never settled before its deadline; worth trying again later, not at once. */
export class RequestTimeout extends ApiError {}

/** A path on the product API as this app reaches it: the web's own origin, or the phone's base URL. */
export function apiUrl(path: string): string {
  return `${clientConfig().baseUrl ?? ""}${path}`;
}

export type RequestOptions = RequestInit & {
  /** Milliseconds before a request the network never settles ends as unreachable. */
  timeout?: number;
};

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const { timeout, ...init } = options ?? {};
  if (!timeout) return send<T>(path, init);
  const limit = deadline(timeout, init.signal);
  try {
    return await send<T>(path, { ...init, signal: limit.signal });
  } catch (error) {
    if (limit.expired()) throw new RequestTimeout(0, unreachable());
    throw error;
  } finally {
    limit.clear();
  }
}

/** Aborts with the caller's signal or after `ms`; the phone's AbortSignal has neither `any` nor `timeout`. */
function deadline(ms: number, outer?: AbortSignal | null) {
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, ms);
  const forward = () => controller.abort();
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener("abort", forward);
  return {
    signal: controller.signal,
    expired: () => expired,
    clear: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", forward);
    },
  };
}

async function send<T>(path: string, init: RequestInit): Promise<T> {
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
        ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...session,
        ...(init.headers ?? {}),
      },
      credentials: config.credentials ?? "include",
    });
  } catch {
    // Status 0 is what the grade outbox reads as offline.
    throw new ApiError(0, unreachable());
  }
  if (res.status === 401) throw new ApiError(401, config.messages.signIn());
  if (res.status === 426) {
    const body = UpdateRequiredOut.safeParse(await res.json().catch(() => null));
    requireUpdate({ updateUrl: body.success ? (body.data.updateUrl ?? null) : null });
    throw new ApiError(426, config.messages.failed());
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      issues?: unknown;
      code?: unknown;
    } | null;
    const code = typeof body?.code === "string" ? body.code : undefined;
    throw new ApiError(res.status, failureMessage(res.status, body), body?.issues, code);
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
export function failureMessage(status: number, body: { issues?: unknown } | null): string {
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

/**
 * A refusal the outboxes wait out rather than drop: a lapsed session waits for sign-in, and a
 * release too old for the API waits for the update.
 */
export function waitsToSend(status: number): boolean {
  return status === 401 || status === 426;
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

/** The server's stable name for a refusal, such as `code_wrong`, or null. */
export function refusalCode(error: unknown): string | null {
  return error instanceof ApiError ? (error.code ?? null) : null;
}
