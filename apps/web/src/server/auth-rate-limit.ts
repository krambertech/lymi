import type { MiddlewareHandler } from "hono";
import { isLoopbackUrl } from "../shared/origins";
import type { AppEnv } from "./index";

interface Budget {
  /** How many requests the window allows. */
  max: number;
  /** How long the window lasts, in seconds. */
  window: number;
}

interface Limits {
  /** Per address, so one mailbox cannot be flooded from many machines. */
  address: Budget;
  /** Per caller, so one machine cannot walk a list of addresses. */
  ip: Budget;
}

/**
 * The credential endpoints that send an email or test a password. Everything else under
 * /api/auth is either read-only or already bound to a session.
 */
const LIMITS: Record<string, Limits> = {
  "/api/auth/sign-in/email": {
    address: { max: 10, window: 15 * 60 },
    ip: { max: 30, window: 15 * 60 },
  },
  "/api/auth/sign-up/email": {
    address: { max: 3, window: 60 * 60 },
    ip: { max: 10, window: 60 * 60 },
  },
  "/api/auth/send-verification-email": {
    address: { max: 3, window: 60 * 60 },
    ip: { max: 10, window: 60 * 60 },
  },
  "/api/auth/request-password-reset": {
    address: { max: 3, window: 60 * 60 },
    ip: { max: 10, window: 60 * 60 },
  },
};

/**
 * Rate limits sign-in, sign-up, resend and reset by address and by caller. Better Auth's own
 * limiter counts requests per path and IP only, which leaves one address open to a flood from
 * many machines. Issue 251.
 *
 * KV has no atomic increment, so a burst of simultaneous requests can read the same count.
 * The window still holds against the sustained attempts these limits exist to stop.
 */
export const limitCredentialRequests: MiddlewareHandler<AppEnv> = async (c, next) => {
  const limits = LIMITS[new URL(c.req.url).pathname];
  if (!limits) return next();

  const address = await addressOf(c.req.raw);
  const checks: { key: string; budget: Budget }[] = [];
  if (address) checks.push({ key: `address:${address}`, budget: limits.address });
  // Every loopback request arrives from the same address, so the per-caller budget would
  // count a whole local test run as one attacker.
  const ip = ipOf(c.req.raw);
  if (ip && !isLoopbackUrl(c.env.PRODUCT_URL)) checks.push({ key: `ip:${ip}`, budget: limits.ip });

  const path = new URL(c.req.url).pathname;
  for (const { key, budget } of checks) {
    const retryAfter = await consume(c.env.SESSIONS, `ratelimit:${path}:${key}`, budget);
    if (retryAfter !== null) return tooManyRequests(retryAfter);
  }
  return next();
};

function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "Too many attempts. Try again later.", retryAfter },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

/** The seconds to wait when the window is full, or null when the request fits inside it. */
async function consume(kv: KVNamespace, key: string, budget: Budget): Promise<number | null> {
  const now = Math.floor(Date.now() / 1000);
  const stored = await kv.get(key);
  const entry = parse(stored);
  if (entry && entry.resetAt > now) {
    if (entry.count >= budget.max) return entry.resetAt - now;
    await put(kv, key, { count: entry.count + 1, resetAt: entry.resetAt });
    return null;
  }
  await put(kv, key, { count: 1, resetAt: now + budget.window });
  return null;
}

interface Window {
  count: number;
  resetAt: number;
}

function parse(stored: string | null): Window | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<Window>;
    return typeof value.count === "number" && typeof value.resetAt === "number"
      ? { count: value.count, resetAt: value.resetAt }
      : null;
  } catch {
    return null;
  }
}

function put(kv: KVNamespace, key: string, window: Window) {
  const ttl = Math.max(60, window.resetAt - Math.floor(Date.now() / 1000));
  return kv.put(key, JSON.stringify(window), { expirationTtl: ttl });
}

/** The address the request is about, read from a clone so the handler still gets the body. */
async function addressOf(request: Request): Promise<string | null> {
  if (request.method !== "POST") return null;
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    return typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase().slice(0, 254)
      : null;
  } catch {
    return null;
  }
}

function ipOf(request: Request): string | null {
  return request.headers.get("cf-connecting-ip") ?? null;
}
