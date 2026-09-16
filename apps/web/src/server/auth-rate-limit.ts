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
  /** `on-success`: an attempt that worked costs nothing, so guessing cannot lock an owner out. */
  spare?: "on-success";
  /**
   * Hold every answer for at least this long. Sign-up refuses an address with no invitation
   * before any email work and admits one after a send, so the bodies are identical but the
   * clock is not. A floor above the slower path removes the difference. Issue 251.
   */
  floorMs?: number;
}

/**
 * The credential endpoints that send an email or test a password. Everything else under
 * /api/auth is either read-only or already bound to a session.
 */
const LIMITS: Record<string, Limits> = {
  "/api/auth/sign-in/email": {
    address: { max: 10, window: 15 * 60 },
    ip: { max: 30, window: 15 * 60 },
    spare: "on-success",
  },
  "/api/auth/sign-up/email": {
    address: { max: 3, window: 60 * 60 },
    ip: { max: 10, window: 60 * 60 },
    floorMs: 700,
  },
  // A send budget is the one an attacker can spend on someone else's behalf, so it sits well
  // above what a learner needs and well under what a flood would want.
  "/api/auth/send-verification-email": {
    address: { max: 6, window: 60 * 60 },
    ip: { max: 10, window: 60 * 60 },
  },
  "/api/auth/request-password-reset": {
    address: { max: 6, window: 60 * 60 },
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
  // A body this middleware cannot read is a body it cannot meter, so it does not pass.
  if (address === UNREADABLE) return badRequest();

  const checks: { key: string; budget: Budget }[] = [];
  if (address) checks.push({ key: `address:${address}`, budget: limits.address });
  // Every loopback request arrives from the same address, so the per-caller budget would
  // count a whole local test run as one attacker.
  if (!isLoopbackUrl(c.env.PRODUCT_URL)) {
    checks.push({ key: `ip:${ipOf(c.req.raw)}`, budget: limits.ip });
  }

  const path = new URL(c.req.url).pathname;
  const keyed = checks.map(({ key, budget }) => ({ key: `ratelimit:${path}:${key}`, budget }));
  for (const { key, budget } of keyed) {
    const full = await windowFull(c.env.SESSIONS, key, budget);
    if (full !== null) return tooManyRequests(full);
  }

  const started = Date.now();
  await next();
  if (limits.floorMs) await holdUntil(started + limits.floorMs);

  // A request the endpoint refused as malformed sent no email and created no account, so it
  // costs nothing: a learner correcting a password Lymi would not accept is not an attack.
  if (c.res.status === 400) return;
  // Nor has a learner who signed in with their own password. Without this, ten guesses at a
  // known address would lock its owner out.
  if (limits.spare === "on-success" && c.res.ok) return;
  for (const { key, budget } of keyed) await count(c.env.SESSIONS, key, budget);
};

function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "Too many attempts. Try again later.", retryAfter },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

/** The seconds to wait when this window has no room left, or null when the request fits. */
async function windowFull(kv: KVNamespace, key: string, budget: Budget): Promise<number | null> {
  const now = Math.floor(Date.now() / 1000);
  const entry = parse(await kv.get(key));
  if (!entry || entry.resetAt <= now || entry.count < budget.max) return null;
  return entry.resetAt - now;
}

/** Record one attempt against the window, opening a new one when the last has run out. */
async function count(kv: KVNamespace, key: string, budget: Budget): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const entry = parse(await kv.get(key));
  const open = entry && entry.resetAt > now;
  await put(kv, key, {
    count: open ? entry.count + 1 : 1,
    resetAt: open ? entry.resetAt : now + budget.window,
  });
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

/** A body that parsed into no address at all, as opposed to one that could not be parsed. */
const UNREADABLE = Symbol("unreadable body");

/**
 * The address the request is about, read from a clone so the handler still gets the body.
 * Better Auth accepts a form-encoded body on these endpoints as well as JSON, and a reader
 * that knew only JSON let a form body walk past the per-address budget. Issue 251.
 */
async function addressOf(request: Request): Promise<string | null | typeof UNREADABLE> {
  if (request.method !== "POST") return null;
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  try {
    const body = request.clone();
    if (type === "application/json") return emailIn((await body.json()) as Record<string, unknown>);
    if (type === "application/x-www-form-urlencoded") {
      return emailIn(Object.fromEntries(new URLSearchParams(await body.text())));
    }
    return UNREADABLE;
  } catch {
    return UNREADABLE;
  }
}

function emailIn(body: Record<string, unknown>): string | null {
  const email = body.email;
  return typeof email === "string" && email.trim()
    ? email.trim().toLowerCase().slice(0, 254)
    : null;
}

function holdUntil(deadline: number): Promise<void> {
  const remaining = deadline - Date.now();
  return remaining > 0
    ? new Promise((resolve) => setTimeout(resolve, remaining))
    : Promise.resolve();
}

function badRequest() {
  return Response.json({ error: "Send this request as JSON." }, { status: 400 });
}

/**
 * Cloudflare sets this header itself and strips any the client sent, so it cannot be spoofed.
 * A request that somehow arrives without one shares a single bucket rather than escaping the
 * budget entirely.
 */
function ipOf(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}
