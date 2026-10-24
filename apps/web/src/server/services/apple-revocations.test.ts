import { generateKeyPairSync } from "node:crypto";
import { newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type AppleClients, openAppleToken, sealAppleToken } from "../apple-revoke";
import { type Db, schema } from "../db";
import { type DeletionDeps, deleteAccount } from "./account-deletion";
import {
  APPLE_REVOKE_ATTEMPTS,
  appleRevocationRow,
  retryAppleRevocations,
  revokeAfterDeletion,
} from "./apple-revocations";
import type { ServiceContext } from "./context";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

const privateKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  .privateKey.export({ format: "pem", type: "pkcs8" })
  .toString();
const app = { bundleIdentifier: "app.lymi", teamId: "TEAM", keyId: "KEY", privateKey };
const clients: AppleClients = { app, web: { ...app, bundleIdentifier: "app.lymi.web" } };

const idToken = (sub: string) => `e30.${btoa(JSON.stringify({ sub })).replaceAll("=", "")}.sig`;
const deps = (appleClients: AppleClients | null): DeletionDeps => ({
  client: "phone",
  request: undefined,
  verifyApple: async () => true,
  endSessions: async () => {},
  appleClients,
  publishers: new Set(),
});

type Reply = Response | "network";
/** Apple's two endpoints, answering from a script per path, and what each call sent. */
function apple(replies: { token?: Reply[]; revoke?: Reply[] }) {
  const sent: { path: string; body: URLSearchParams }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname.split("/").pop() as "token" | "revoke";
    sent.push({ path, body: new URLSearchParams(String(init?.body)) });
    const reply = replies[path]?.shift() ?? new Response(null, { status: 200 });
    if (reply === "network") throw new TypeError("fetch failed");
    return reply;
  }) as unknown as typeof fetch;
  return { fetcher, sent };
}
const token = () => Response.json({ refresh_token: "apple-refresh" });

function events() {
  const captured: unknown[] = [];
  return {
    captured,
    writer: { writeDataPoint: () => {}, capture: (event: unknown) => captured.push(event) },
  };
}

async function appleLearner(handle: string, refreshToken?: string): Promise<ServiceContext> {
  const ctx = await learner(db, handle, handle);
  await db.insert(schema.account).values({
    id: newId(),
    accountId: `apple-${handle}`,
    providerId: "apple",
    userId: ctx.userId,
    refreshToken: refreshToken ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ctx;
}

/** Deletes through the phone's Apple sheet, which hands over a one-use authorization code. */
async function deleteWithApple(
  ctx: ServiceContext,
  handle: string,
  appleClients: AppleClients | null,
) {
  const apple = { idToken: idToken(`apple-${handle}`), nonce: "n", authorizationCode: "code" };
  return deleteAccount(ctx, { apple }, deps(appleClients));
}

async function row(id: string) {
  const [found] = await db
    .select()
    .from(schema.appleRevocations)
    .where(eq(schema.appleRevocations.id, id));
  return found;
}

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("revoking a deleted account's Apple grant", () => {
  it("records the grant with the delete, then trades the phone's code and revokes it", async () => {
    const ctx = await appleLearner("aino");
    const leftovers = await deleteWithApple(ctx, "aino", clients);
    expect(leftovers.appleRevocation).toEqual({ status: "pending", reason: null });
    expect(await row(ctx.userId)).toMatchObject({ status: "pending", client: "app", token: null });

    const { fetcher, sent } = apple({ token: [token()] });
    const { captured, writer } = events();
    const outcome = await revokeAfterDeletion(db, ctx.userId, "code", {
      clients,
      fetcher,
      events: writer,
    });

    expect(outcome).toBe("revoked");
    expect(sent.map((call) => call.path)).toEqual(["token", "revoke"]);
    expect(sent[1]?.body.get("client_id")).toBe("app.lymi");
    expect(sent[1]?.body.get("token")).toBe("apple-refresh");
    expect(await row(ctx.userId)).toMatchObject({ status: "revoked", token: null, attempts: 1 });
    expect(captured).toEqual([
      { name: "apple_revocation_attempted", outcome: "revoked", attempt: 1 },
    ]);
  });

  it("keeps a refused revoke sealed and retries it from the cron until Apple accepts", async () => {
    const ctx = await appleLearner("mikk");
    await deleteWithApple(ctx, "mikk", clients);
    const first = apple({ token: [token()], revoke: [new Response(null, { status: 503 })] });
    const start = new Date();
    expect(
      await revokeAfterDeletion(db, ctx.userId, "code", { clients, fetcher: first.fetcher }, start),
    ).toBe("retrying");
    const waiting = await row(ctx.userId);
    expect(waiting).toMatchObject({ status: "pending", reason: "revoke", attempts: 1 });
    expect(waiting?.token).not.toContain("apple-refresh");
    expect(await openAppleToken(app, waiting?.token ?? "")).toBe("apple-refresh");

    const early = apple({});
    await retryAppleRevocations(db, { clients, fetcher: early.fetcher }, start);
    expect(early.sent).toEqual([]);

    const later = apple({});
    const due = new Date(start.getTime() + 16 * 60 * 1000);
    const counts = await retryAppleRevocations(db, { clients, fetcher: later.fetcher }, due);
    expect(counts).toMatchObject({ revoked: 1 });
    expect(later.sent.map((call) => call.body.get("token"))).toEqual(["apple-refresh"]);
    expect(await row(ctx.userId)).toMatchObject({ status: "revoked", token: null, attempts: 2 });
  });

  it("tries the code again after a network failure, but not after Apple refuses it", async () => {
    const flaky = await appleLearner("tiit");
    await deleteWithApple(flaky, "tiit", clients);
    const network = apple({ token: ["network", token()] });
    const sleep = vi.fn(async () => {});
    expect(
      await revokeAfterDeletion(db, flaky.userId, "code", {
        clients,
        fetcher: network.fetcher,
        sleep,
      }),
    ).toBe("revoked");
    expect(sleep).toHaveBeenCalledTimes(1);

    const refused = await appleLearner("piret");
    await deleteWithApple(refused, "piret", clients);
    const spent = apple({ token: [Response.json({ error: "invalid_grant" }, { status: 400 })] });
    const { captured, writer } = events();
    expect(
      await revokeAfterDeletion(db, refused.userId, "code", {
        clients,
        fetcher: spent.fetcher,
        sleep,
        events: writer,
      }),
    ).toBe("failed");
    expect(spent.sent).toHaveLength(1);
    expect(await row(refused.userId)).toMatchObject({ status: "failed", reason: "exchange" });
    expect(captured).toEqual([
      { name: "apple_revocation_attempted", outcome: "failed", attempt: 0, reason: "exchange" },
    ]);
  });

  it("gives up after the last attempt and leaves the grant on record as failed", async () => {
    const ctx = await appleLearner("enn");
    await deleteWithApple(ctx, "enn", clients);
    const refusing = () => apple({ revoke: [new Response(null, { status: 400 })] }).fetcher;
    let at = new Date();
    await revokeAfterDeletion(
      db,
      ctx.userId,
      "code",
      {
        clients,
        fetcher: apple({ token: [token()], revoke: [new Response(null, { status: 400 })] }).fetcher,
      },
      at,
    );
    let counts = { revoked: 0, retrying: 0, failed: 0 };
    for (let attempt = 2; attempt <= APPLE_REVOKE_ATTEMPTS; attempt++) {
      at = new Date(at.getTime() + 25 * 60 * 60 * 1000);
      counts = await retryAppleRevocations(db, { clients, fetcher: refusing() }, at);
    }
    expect(counts.failed).toBe(1);
    expect(await row(ctx.userId)).toMatchObject({
      status: "failed",
      reason: "revoke",
      attempts: APPLE_REVOKE_ATTEMPTS,
      token: null,
    });
  });

  it("marks a code that was never traded as lost once it can no longer work", async () => {
    const ctx = await appleLearner("urve");
    await deleteWithApple(ctx, "urve", clients);
    const soon = await retryAppleRevocations(db, { clients }, new Date(Date.now() + 60_000));
    expect(soon.failed).toBe(0);
    const later = await retryAppleRevocations(
      db,
      { clients },
      new Date(Date.now() + 11 * 60 * 1000),
    );
    expect(later.failed).toBeGreaterThanOrEqual(1);
    expect(await row(ctx.userId)).toMatchObject({ status: "failed", reason: "lost" });
  });

  it("revokes the token web sign-in stored when the delete was confirmed by email", async () => {
    const ctx = await appleLearner("kati", "web-refresh");
    const leftovers = await deleteAccount(
      ctx,
      { apple: { idToken: idToken("apple-kati"), nonce: "n" } },
      deps(clients),
    );
    expect(leftovers.appleRevocation?.status).toBe("pending");
    const { fetcher, sent } = apple({});
    const counts = await retryAppleRevocations(db, { clients, fetcher });
    expect(counts.revoked).toBeGreaterThanOrEqual(1);
    const call = sent.find((entry) => entry.body.get("token") === "web-refresh");
    expect(call?.body.get("client_id")).toBe("app.lymi.web");
    expect(await row(ctx.userId)).toMatchObject({ status: "revoked", client: "web" });
  });

  it("records a skip when there is no Apple key or nothing to revoke with", async () => {
    const keyless = await appleLearner("vello");
    const noKey = await deleteWithApple(keyless, "vello", null);
    expect(noKey.appleRevocation).toEqual({ status: "skipped", reason: "no_key" });

    const tokenless = await appleLearner("helju");
    const noToken = await deleteAccount(
      tokenless,
      { apple: { idToken: idToken("apple-helju"), nonce: "n" } },
      deps(clients),
    );
    expect(noToken.appleRevocation).toEqual({ status: "skipped", reason: "no_token" });
    expect(await row(tokenless.userId)).toMatchObject({ status: "skipped", token: null });
  });

  it("writes nothing for an account without Apple", async () => {
    const ctx = await learner(db, "jaan", "Jaan");
    expect(await appleRevocationRow(db, ctx.userId, clients, "code", new Date())).toBeNull();
  });

  it("opens a sealed token only with the key that sealed it", async () => {
    const sealed = await sealAppleToken(app, "apple-refresh");
    expect(await openAppleToken(app, sealed)).toBe("apple-refresh");
    const rotated = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
      .privateKey.export({ format: "pem", type: "pkcs8" })
      .toString();
    expect(await openAppleToken({ ...app, privateKey: rotated }, sealed)).toBeNull();
  });
});
