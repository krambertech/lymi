import { readdirSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { AddCardsOut, CLIENT_HEADER, DeckOut, formatClientHeader } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { cookiePrefix } from "../shared/cookies";
import { schema } from "./db";
import { latestLocalEmail } from "./services/email";
import { signUpCookieName } from "./signup-cookie";
import { json, type Session, type TestApp, testApp } from "./test-app";

/**
 * The phone's calls the OpenAPI document leaves out, so no freeze in apps/mobile/contract guards
 * them: Better Auth under /api/auth, the photo, pronunciation audio and feedback. Each test sends
 * what an installed release sends and checks what that release reads back, so a change here is a
 * phone break that needs a version gate first. ADR 0032.
 */
const releases = readdirSync(join(import.meta.dirname, "../../../mobile/contract"))
  .filter((name) => name.endsWith(".json"))
  .map((name) => name.replace(/\.json$/, ""));

const PASSWORD = "lantern-over-the-water-58";

let app: TestApp;

beforeAll(async () => {
  app = await testApp({ env: { GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "secret" } });
}, 60_000);

describe.each(releases)("the phone release %s", (version) => {
  const handle = (name: string) => `${name}-${version.replaceAll(".", "-")}`;

  /** A request as the release sends it: its name, no Origin, its scheme in `expo-origin`. */
  function fromPhone(init: RequestInit & { as?: Session | undefined } = {}) {
    const headers = new Headers(init.headers);
    headers.set(CLIENT_HEADER, formatClientHeader({ platform: "ios", version }));
    headers.set("expo-origin", "lymi://");
    return { ...init, headers };
  }

  const post = (path: string, body: unknown, cookie?: string) =>
    app.fetch(path, fromPhone(json(body, cookie ? { headers: { cookie } } : {})) as RequestInit);

  /** Better Auth's client reads `code` from a failure and nothing else; `use-sign-in.ts`. */
  async function failure(response: Response) {
    const { code } = (await response.json()) as { code?: string };
    return { status: response.status, code };
  }

  describe("Better Auth", () => {
    it("names its cookies with the prefixes the release keeps", async () => {
      // The release keeps `lymi` and `__Host-lymi` in production, and `lymi-<port>` on loopback.
      expect(cookiePrefix("https://my.lymi.app")).toBe("lymi");
      expect(signUpCookieName("https://my.lymi.app").startsWith("__Host-lymi")).toBe(true);
      const port = new URL(app.env.PRODUCT_URL).port;
      const email = `${handle("cookies")}@lymi.test`;
      const created = await post("/api/auth/sign-up/email", {
        email,
        password: PASSWORD,
        name: "C",
      });
      expect(created.status).toBe(200);
      expect(cookieNames(created)).not.toEqual([]);
      for (const name of cookieNames(created)) expect(name).toMatch(new RegExp(`^lymi-${port}`));
    });

    it("creates an account, confirms it with a code and signs it in", async () => {
      const email = `${handle("new")}@lymi.test`;
      const created = await post("/api/auth/sign-up/email", {
        email,
        password: PASSWORD,
        name: email.split("@")[0],
      });
      expect(created.status).toBe(200);

      const unconfirmed = await post("/api/auth/sign-in/email", { email, password: PASSWORD });
      expect(await failure(unconfirmed)).toEqual({ status: 403, code: "EMAIL_NOT_VERIFIED" });

      const resent = await post("/api/auth/email-otp/send-verification-otp", {
        email,
        type: "email-verification",
      });
      expect(resent.status).toBe(200);
      const otp = latestLocalEmail(email)?.text.match(/^\d{6}$/m)?.[0] ?? "";
      expect(otp).toHaveLength(6);

      const wrong = otp === "000000" ? "111111" : "000000";
      const refused = await post("/api/auth/email-otp/verify-email", { email, otp: wrong });
      expect(await failure(refused)).toEqual({ status: 400, code: "INVALID_OTP" });

      const confirmed = await post(
        "/api/auth/email-otp/verify-email",
        { email, otp },
        cookieOf(created),
      );
      expect(confirmed.status).toBe(200);
      const cookie = cookieOf(confirmed);
      expect(cookie).toContain("session_token=");

      // `useSession` reads the learner from here; the You tab shows the name and address.
      const session = await app.fetch("/api/auth/get-session", fromPhone({ headers: { cookie } }));
      expect(session.status).toBe(200);
      expect(await session.json()).toMatchObject({
        user: { id: expect.any(String), name: expect.any(String), email },
        session: { expiresAt: expect.any(String) },
      });

      const signedOut = await post("/api/auth/sign-out", {}, cookie);
      expect(signedOut.status).toBe(200);
    });

    it("answers a wrong password with the code the release explains", async () => {
      const email = `${handle("password")}@lymi.local`;
      await post("/api/auth/sign-up/email", { email, password: PASSWORD, name: "P" });
      const response = await post("/api/auth/sign-in/email", { email, password: `${PASSWORD}x` });
      expect(await failure(response)).toEqual({ status: 401, code: "INVALID_EMAIL_OR_PASSWORD" });
      const signedIn = await post("/api/auth/sign-in/email", { email, password: PASSWORD });
      expect(signedIn.status).toBe(200);
      expect(cookieOf(signedIn)).toContain("session_token=");
    });

    it("answers a password it refuses with the codes the release maps to a field", async () => {
      const email = `${handle("weak")}@lymi.test`;
      for (const [password, code] of [
        ["short", "PASSWORD_TOO_SHORT"],
        ["x".repeat(200), "PASSWORD_TOO_LONG"],
        ["password1234", "PASSWORD_TOO_GUESSABLE"],
      ] as const) {
        const response = await post("/api/auth/sign-up/email", { email, password, name: "W" });
        expect(await failure(response)).toEqual({ status: 400, code });
      }
    });

    it("answers an address it cannot use with INVALID_EMAIL", async () => {
      const response = await post("/api/auth/sign-in/email", {
        email: "not@an@address",
        password: PASSWORD,
      });
      expect(await failure(response)).toEqual({ status: 400, code: "INVALID_EMAIL" });
    });

    it("stops a code after five wrong tries with TOO_MANY_ATTEMPTS", async () => {
      const email = `${handle("tries")}@lymi.test`;
      await post("/api/auth/sign-up/email", { email, password: PASSWORD, name: "T" });
      const otp = latestLocalEmail(email)?.text.match(/^\d{6}$/m)?.[0] ?? "";
      const wrong = otp === "000000" ? "111111" : "000000";
      for (let attempt = 0; attempt < 5; attempt++) {
        await post("/api/auth/email-otp/verify-email", { email, otp: wrong });
      }
      const response = await post("/api/auth/email-otp/verify-email", { email, otp });
      expect(await failure(response)).toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
    });

    it("answers an expired code with OTP_EXPIRED", async () => {
      const email = `${handle("expired")}@lymi.test`;
      await post("/api/auth/sign-up/email", { email, password: PASSWORD, name: "E" });
      const otp = latestLocalEmail(email)?.text.match(/^\d{6}$/m)?.[0] ?? "";
      vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 24 * 60 * 60 * 1000 });
      try {
        const response = await post("/api/auth/email-otp/verify-email", { email, otp });
        expect(await failure(response)).toMatchObject({ code: "OTP_EXPIRED" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("sends a reset link to the web's page", async () => {
      const email = `${handle("forgot")}@lymi.test`;
      const response = await post("/api/auth/request-password-reset", {
        email,
        redirectTo: `/reset-password?${new URLSearchParams({ email })}`,
      });
      expect(response.status).toBe(200);
    });

    it("starts a Google sign-in with a page to open", async () => {
      const response = await post("/api/auth/sign-in/social", {
        provider: "google",
        callbackURL: "lymi:///",
      });
      expect(response.status).toBe(200);
      const { url } = (await response.json()) as { url: string };
      expect(new URL(url).hostname).toBe("accounts.google.com");
    });
  });

  describe("signed in", () => {
    let learner: Session;
    let cardId: string;

    beforeAll(async () => {
      learner = await app.signUp(handle("media"));
      const deck = await app.fetch("/api/decks", {
        ...json({ name: "Lesson 3", defaultLanguage: "et" }),
        as: learner,
      });
      const deckId = DeckOut.parse(await deck.json()).id;
      const cards = await app.fetch("/api/cards/batch", {
        ...json({ cards: [{ deckId, term: "tere", meaning: "hello" }] }),
        as: learner,
      });
      const [first] = AddCardsOut.parse(await cards.json()).results;
      if (first?.status !== "added") throw new Error("The seeded card was not added");
      cardId = first.card.id;
    }, 60_000);

    it("reads, replaces, shows and removes the learner's photo", async () => {
      const read = await app.fetch("/api/avatar", fromPhone({ as: learner }));
      expect(read.status).toBe(200);
      const empty = avatarOf(await read.json());
      expect(empty).toMatchObject({ source: null, version: null });

      const jpeg = await jpegBytes();
      const uploaded = await app.fetch(
        "/api/avatar",
        fromPhone({
          as: learner,
          method: "PUT",
          body: jpeg,
          headers: { "content-type": "image/jpeg", "if-match": `"${empty.revision}"` },
        }),
      );
      expect(uploaded.status).toBe(200);
      const custom = avatarOf(await uploaded.json());
      expect(custom).toMatchObject({ source: "custom", version: expect.any(String) });

      // React Native's Image sends the session itself and reads only the bytes.
      const image = await app.fetch(`/api/avatar/${custom.version}`, fromPhone({ as: learner }));
      expect(image.status).toBe(200);
      expect(image.headers.get("content-type")).toMatch(/^image\//);
      expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(0);

      // A change made from an older revision is refused, so the release reads the photo again.
      const stale = await app.fetch(
        "/api/avatar",
        fromPhone({
          as: learner,
          method: "DELETE",
          headers: { "if-match": `"${empty.revision}"` },
        }),
      );
      expect(stale.status).toBe(409);

      const removed = await app.fetch(
        "/api/avatar",
        fromPhone({
          as: learner,
          method: "DELETE",
          headers: { "if-match": `"${custom.revision}"` },
        }),
      );
      expect(removed.status).toBe(200);
      expect(avatarOf(await removed.json())).toMatchObject({ source: null, version: null });
    });

    it("plays a card's pronunciation as audio", async () => {
      // No speech provider runs here, so the card's remembered audio is what is served.
      const key = `test/${cardId}.mp3`;
      await app.env.AUDIO.put(key, new Uint8Array([0xff, 0xfb, 0x90, 0x00]), {
        httpMetadata: { contentType: "audio/mpeg" },
      });
      await app.db.update(schema.cards).set({ audioKey: key }).where(eq(schema.cards.id, cardId));

      // expo-audio fetches the URL with the session headers and plays whatever audio comes back.
      const response = await app.fetch(
        `/api/audio/${encodeURIComponent(cardId)}`,
        fromPhone({ as: learner }),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/^audio\//);
      expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
    });

    it("takes feedback as the release sends it", async () => {
      const response = await app.fetch("/api/feedback", {
        ...fromPhone(
          json({ kind: "bug", message: "The lantern flickers.", screen: "/you", language: "en" }),
        ),
        as: learner,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });
});

/** The fields the release reads from a photo; `packages/client/src/api/account.ts`. */
function avatarOf(body: unknown) {
  expect(body).toMatchObject({
    source: expect.toBeOneOf(["custom", "google", null]),
    version: expect.toBeOneOf([expect.any(String), null]),
    revision: expect.any(Number),
  });
  return body as { source: string | null; version: string | null; revision: number };
}

function cookieOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

function cookieNames(response: Response): string[] {
  return response.headers.getSetCookie().map((entry) => entry.split("=")[0] ?? "");
}

/** A small JPEG, which is what the release's picker hands over. */
async function jpegBytes(): Promise<ArrayBuffer> {
  const result = await app.env.IMAGES.input(new Response(png(64, 64)).body as ReadableStream)
    .transform({ width: 64, height: 64 })
    .output({ format: "image/jpeg" });
  return result.response().arrayBuffer();
}

function png(width: number, height: number) {
  const row = [0, ...Array.from({ length: width }, () => [200, 120, 40, 255]).flat()];
  const raw = Buffer.from(Array.from({ length: height }, () => row).flat());
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
