import { createHash, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { DESKTOP_APP_SCHEME } from "../shared/origins";
import { createAuth } from "./auth";
import { json, type Session, type TestApp, testApp } from "./test-app";

/**
 * The Mac app signs in through the system browser: `/desktop/sign-in` hands a signed-in learner's
 * one-time code to the app, which trades it with its PKCE verifier. apps/desktop/src/sign-in.ts.
 */
let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("mac-hand-off");
}, 60_000);

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

function pkce() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge, state: base64Url(randomBytes(12)) };
}

async function handOff(as: Session | undefined, challenge: string, state: string) {
  const query = new URLSearchParams({ client_id: "electron", code_challenge: challenge, state });
  return app.fetch(`/api/auth/electron/transfer-user?${query}`, { ...json({}), as });
}

const trade = (token: string, state: string, verifier: string) =>
  app.fetch("/api/auth/electron/token", json({ token, state, code_verifier: verifier }));

describe("signing the Mac app in", () => {
  it("trades a signed-in learner's code for a session once, with the right verifier", async () => {
    const { verifier, challenge, state } = pkce();
    const handed = await handOff(learner, challenge, state);
    expect(handed.status).toBe(200);
    const { electron_authorization_code: code } = (await handed.json()) as {
      electron_authorization_code: string;
    };

    const traded = await trade(code, state, verifier);
    expect(traded.status).toBe(200);
    expect(traded.headers.getSetCookie().join(";")).toContain("session_token=");
    expect(await traded.json()).toMatchObject({ user: { email: learner.email } });

    expect((await trade(code, state, verifier)).status).toBe(404);
  });

  it("refuses a code traded with another verifier or state", async () => {
    const first = pkce();
    const handed = await handOff(learner, first.challenge, first.state);
    const { electron_authorization_code: code } = (await handed.json()) as {
      electron_authorization_code: string;
    };
    expect((await trade(code, first.state, pkce().verifier)).status).toBe(400);

    const second = pkce();
    const again = await handOff(learner, second.challenge, second.state);
    const { electron_authorization_code: other } = (await again.json()) as {
      electron_authorization_code: string;
    };
    expect((await trade(other, "another-state", second.verifier)).status).toBe(400);
  });

  it("hands nothing over without a signed-in learner", async () => {
    const { challenge, state } = pkce();
    expect((await handOff(undefined, challenge, state)).status).toBe(401);
  });

  it("does not start a sign-in from a bare link", async () => {
    const { challenge, state } = pkce();
    const query = new URLSearchParams({ provider: "google", state, code_challenge: challenge });
    const response = await app.fetch(`/api/auth/electron/init-oauth-proxy?${query}`);
    expect(response.status).toBe(404);
  });

  it("trusts the app's own scheme", async () => {
    // Better Auth skips its origin check under test, so this asks the rule itself.
    const context = await createAuth(app.env, app.db).$context;
    expect(context.isTrustedOrigin(`${DESKTOP_APP_SCHEME}:/`)).toBe(true);
    expect(context.isTrustedOrigin("app.lymi.other:/")).toBe(false);
  });
});
