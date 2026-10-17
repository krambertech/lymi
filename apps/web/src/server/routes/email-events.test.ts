import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { AppEnv } from "../index";
import { testDb } from "../services/test-db";
import { emailEvents } from "./email-events";

const secretBytes = new TextEncoder().encode("a webhook secret of some length");
const secret = `whsec_${btoa(String.fromCharCode(...secretBytes))}`;

async function signed(id: string, body: string): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  return {
    "svix-id": id,
    "svix-timestamp": timestamp,
    "svix-signature": `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`,
  };
}

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

function app() {
  const store = new Map<string, string>();
  const sessions = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => void store.set(key, value),
  };
  const routes = new Hono<AppEnv>();
  routes.use(async (c, next) => {
    c.set("db", db);
    await next();
  });
  routes.route("/", emailEvents);
  const env = {
    RESEND_WEBHOOK_SECRET: secret,
    SESSIONS: sessions,
  } as unknown as AppEnv["Bindings"];
  const ctx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
  return (headers: Record<string, string>, body: string) =>
    routes.request("/", { method: "POST", headers, body }, env, ctx);
}

describe("email delivery webhook", () => {
  const body = JSON.stringify({
    type: "email.bounced",
    data: { to: ["nobody@example.com"], tags: { kind: "verify-email" } },
  });

  it("counts a delivery Resend retries under the same id once", async () => {
    const post = app();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const headers = await signed("msg_retried", body);
    expect((await post(headers, body)).status).toBe(200);
    expect((await post(headers, body)).status).toBe(200);
    const bounces = log.mock.calls.filter(([line]) => String(line).includes("email_bounced"));
    expect(bounces).toHaveLength(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain("nobody@example.com");
    log.mockRestore();
  });

  it("refuses an unsigned delivery", async () => {
    const post = app();
    expect((await post({ "content-type": "application/json" }, body)).status).toBe(401);
  });
});
