import { describe, expect, it } from "vitest";
import { deliveryProblem, verifyResendWebhook } from "./resend";

const secretBytes = new TextEncoder().encode("a webhook secret of some length");
const secret = `whsec_${btoa(String.fromCharCode(...secretBytes))}`;

async function sign(id: string, timestamp: string, body: string): Promise<string> {
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
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(mac)))}`;
}

describe("Resend webhook", () => {
  const now = 1_790_000_000_000;
  const timestamp = String(now / 1000);
  const body = JSON.stringify({ type: "email.bounced", data: { to: ["a@example.com"] } });

  it("accepts a body signed with the secret, among other signatures", async () => {
    const signature = `v1,bm90IGl0 ${await sign("msg_1", timestamp, body)}`;
    await expect(
      verifyResendWebhook(secret, { id: "msg_1", timestamp, signature }, body, now),
    ).resolves.toBe(true);
  });

  it("refuses a changed body, a stale timestamp and missing headers", async () => {
    const signature = await sign("msg_1", timestamp, body);
    await expect(
      verifyResendWebhook(secret, { id: "msg_1", timestamp, signature }, `${body} `, now),
    ).resolves.toBe(false);
    await expect(
      verifyResendWebhook(
        secret,
        { id: "msg_1", timestamp, signature },
        body,
        now + 10 * 60 * 1000,
      ),
    ).resolves.toBe(false);
    await expect(
      verifyResendWebhook(secret, { id: null, timestamp, signature }, body, now),
    ).resolves.toBe(false);
  });

  it("reads bounces and complaints with their kind, and ignores everything else", () => {
    expect(
      deliveryProblem({
        type: "email.complained",
        data: { to: ["a@example.com"], tags: { kind: "deck-invitation" } },
      }),
    ).toEqual({ type: "complained", to: ["a@example.com"], kind: "deck-invitation" });
    expect(
      deliveryProblem({
        type: "email.bounced",
        data: { to: ["a@example.com"], tags: [{ name: "kind", value: "verify-email" }] },
      }),
    ).toEqual({ type: "bounced", to: ["a@example.com"], kind: "verify-email" });
    expect(deliveryProblem({ type: "email.delivered", data: { to: ["a@example.com"] } })).toBe(
      null,
    );
  });
});
