import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";
import { consentEvent } from "./consent-analytics";

const SITE = "https://lymi.app";
const oauthQuery = new URLSearchParams({
  client_id: "https://chatgpt.com/oauth/client.json",
  scope: "read write offline_access",
  redirect_uri: "https://chatgpt.com/connector_platform_oauth_redirect",
  sig: "signed",
}).toString();
const granted = {
  redirect: true,
  url: "https://chatgpt.com/connector_platform_oauth_redirect?code=abc&state=s",
};

describe("consentEvent", () => {
  it("records a grant with the assistant and whether it may write", () => {
    expect(consentEvent({ accept: true, oauth_query: oauthQuery }, granted, SITE)).toEqual({
      name: "app_connected",
      client: "chatgpt",
      write: true,
    });
  });

  it("records a grant narrowed to read as read-only", () => {
    const body = { accept: true, scope: "read offline_access", oauth_query: oauthQuery };
    expect(consentEvent(body, granted, SITE)).toMatchObject({
      name: "app_connected",
      write: false,
    });
  });

  it("records a refusal as declined", () => {
    const refused = { redirect: true, url: "https://chatgpt.com/cb?error=access_denied" };
    expect(consentEvent({ accept: false, oauth_query: oauthQuery }, refused, SITE)).toEqual({
      name: "app_connect_failed",
      client: "chatgpt",
      reason: "declined",
    });
  });

  it("records a consent the server could not save as an error", () => {
    const error = new APIError("BAD_REQUEST", { error: "invalid_request" });
    expect(consentEvent({ accept: true, oauth_query: oauthQuery }, error, SITE)).toEqual({
      name: "app_connect_failed",
      client: "chatgpt",
      reason: "error",
    });
  });

  it("records nothing when the answer only sends the learner back to sign in", () => {
    const login = { redirect: true, url: "https://my.lymi.app/login?client_id=x" };
    expect(consentEvent({ accept: true, oauth_query: oauthQuery }, login, SITE)).toBeNull();
  });

  it("labels a client it does not recognise as other", () => {
    const query = new URLSearchParams({ client_id: "https://agent.example/c.json" }).toString();
    expect(consentEvent({ accept: false, oauth_query: query }, {}, SITE)).toMatchObject({
      client: "other",
    });
  });
});
