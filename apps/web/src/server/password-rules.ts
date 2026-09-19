import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type PasswordProblem,
  passwordProblem,
} from "@lymi/core";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./index";

/** The endpoints that accept a new password. Better Auth checks only its length. */
const GUARDED = new Set(["/api/auth/sign-up/email", "/api/auth/reset-password"]);

/**
 * Hold a new password to Lymi's own rule before Better Auth stores it. The browser checks the
 * same rule from `@lymi/core`, so this is what makes it true rather than a suggestion: the
 * endpoints take a form-encoded body as readily as JSON, and neither shape comes from a form
 * we control. Issue 251.
 */
export const requireStrongPassword: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== "POST" || !GUARDED.has(new URL(c.req.url).pathname)) return next();

  const body = await readBody(c.req.raw);
  if (!body) return next();

  // `newPassword` on a reset, `password` on a sign-up.
  const password = body.newPassword ?? body.password;
  if (typeof password !== "string") return next();

  const problem = passwordProblem(
    password,
    typeof body.email === "string" ? body.email : undefined,
  );
  if (!problem) return next();
  return Response.json({ code: codeFor(problem), message: messageFor(problem) }, { status: 400 });
};

/** Better Auth's own codes where they fit, so one client mapping covers both sources. */
function codeFor(problem: PasswordProblem): string {
  switch (problem) {
    case "too-short":
      return "PASSWORD_TOO_SHORT";
    case "too-long":
      return "PASSWORD_TOO_LONG";
    default:
      return "PASSWORD_TOO_GUESSABLE";
  }
}

function messageFor(problem: PasswordProblem): string {
  switch (problem) {
    case "too-short":
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "too-long":
      return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
    case "too-common":
      return "That password is too easy to guess. Try another.";
    case "from-address":
      return "Don’t use your email address in your password.";
    case "from-lymi":
      return "Don’t use “Lymi” in your password.";
  }
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  try {
    const clone = request.clone();
    if (type === "application/json") return (await clone.json()) as Record<string, unknown>;
    if (type === "application/x-www-form-urlencoded") {
      return Object.fromEntries(new URLSearchParams(await clone.text()));
    }
    return null;
  } catch {
    return null;
  }
}
