import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo-crypto", () => ({
  randomUUID: () => "fresh-raw-nonce",
  CryptoDigestAlgorithm: { SHA256: "SHA256" },
  digestStringAsync: vi.fn(async () => "hashed-nonce"),
}));
vi.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: vi.fn(),
}));

import { signInAsync } from "expo-apple-authentication";
import { appleSignInCancelled, requestAppleCredential } from "./apple";

beforeEach(() => vi.clearAllMocks());

describe("native Apple credential", () => {
  it("gives Apple the hash and the server the raw nonce, keeping the first name and code", async () => {
    vi.mocked(signInAsync).mockResolvedValue({
      identityToken: "signed-token",
      authorizationCode: "single-use-code",
      fullName: { givenName: "Ada", familyName: "Apple" },
    } as Awaited<ReturnType<typeof signInAsync>>);
    const result = await requestAppleCredential();
    expect(signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1], nonce: "hashed-nonce" });
    expect(result).toEqual({
      token: "signed-token",
      nonce: "fresh-raw-nonce",
      authorizationCode: "single-use-code",
      user: { name: { firstName: "Ada", lastName: "Apple" } },
    });
  });

  it("does not submit a credential without a signed identity token", async () => {
    vi.mocked(signInAsync).mockResolvedValue({ identityToken: null } as Awaited<
      ReturnType<typeof signInAsync>
    >);
    await expect(requestAppleCredential()).rejects.toThrow("Apple returned no identity token");
  });

  it("recognizes cancellation separately from failed authentication", () => {
    expect(appleSignInCancelled({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
    expect(appleSignInCancelled({ code: "ERR_REQUEST_FAILED" })).toBe(false);
    expect(appleSignInCancelled(null)).toBe(false);
  });
});
