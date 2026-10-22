import { expect, it, vi } from "vitest";

const social = vi.hoisted(() => vi.fn());
vi.mock("better-auth/react", () => ({
  createAuthClient: () => ({ signIn: { social } }),
}));
vi.mock("./telemetry", () => ({
  firstTouchData: () => ({}),
  withFirstTouch: (path: string) => `${path}&utm_source=newsletter`,
}));

const { signInWithApple, signInWithGoogle } = await import("./auth");

it.each([
  ["google", signInWithGoogle],
  ["apple", signInWithApple],
] as const)("a failed %s sign-in returns to /login with the first touch", (provider, signIn) => {
  social.mockClear();
  signIn("/review");
  expect(social).toHaveBeenCalledWith(
    expect.objectContaining({
      provider,
      callbackURL: "/review",
      errorCallbackURL: "/login?returnTo=%2Freview&utm_source=newsletter",
    }),
  );
});
