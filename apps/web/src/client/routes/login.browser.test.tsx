import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { messages } from "../../locales/en.po";

i18n.load("en", messages);
i18n.activate("en");

/** The route's own part of the email form: which form an answer lands on, and the notice it shows. */
const { auth } = vi.hoisted(() => ({
  auth: { signIn: vi.fn(), signUp: vi.fn(), sendVerificationEmail: vi.fn() },
}));

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: { component: ComponentType }) => ({
    options,
    useSearch: () => ({}),
  }),
}));
vi.mock("../lib/auth", () => ({
  authClient: {
    signIn: { email: auth.signIn },
    signUp: { email: auth.signUp },
    sendVerificationEmail: auth.sendVerificationEmail,
    getSession: async () => ({ data: null }),
  },
  continueOAuthAuthorization: async () => false,
  followOAuthRedirect: () => false,
  signInWithApple: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

async function renderLogin() {
  const { Route } = await import("./login");
  const Screen = (Route as unknown as { options: { component: ComponentType } }).options.component;
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <Screen />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

async function signInAs(email: string) {
  await userEvent.fill(page.getByRole("textbox", { name: "Email" }), email);
  await userEvent.fill(page.getByLabelText("Password", { exact: true }), "correct horse");
  await userEvent.click(page.getByRole("button", { name: "Sign in", exact: true }));
}

const status = () => page.getByRole("status").element().textContent;

test("an unconfirmed sign-in says the address may need confirming, and Send it again shows it is busy", async () => {
  auth.signIn.mockResolvedValue({ error: { code: "EMAIL_NOT_VERIFIED", status: 403 } });
  let delivered = () => {};
  auth.sendVerificationEmail
    .mockResolvedValueOnce({ error: null })
    .mockImplementationOnce(
      () => new Promise((resolve) => (delivered = () => resolve({ error: null }))),
    );
  await renderLogin();
  await signInAs("ana@example.com");

  await expect.poll(status).toContain("If ana@example.com isn’t confirmed yet");
  const again = page.getByRole("button", { name: "Send it again" });
  await userEvent.click(again);
  await expect.element(again).toHaveAttribute("aria-busy", "true");

  delivered();
  await expect.poll(status).toContain("Sent again");
  await expect.poll(status).toContain("If ana@example.com isn’t confirmed yet");
});

test("a sign-in answer that comes back after a switch to Create account stays off that form", async () => {
  let refuse = () => {};
  auth.signIn.mockImplementation(
    () =>
      new Promise((resolve) => {
        refuse = () => resolve({ error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 } });
      }),
  );
  await renderLogin();
  await signInAs("ana@example.com");
  await userEvent.click(page.getByRole("button", { name: "Create an account" }));
  await expect.element(page.getByRole("button", { name: "Create account" })).toBeVisible();

  refuse();
  // The refusal is a microtask away; the form must still be clean once it settles.
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(page.getByRole("alert").query()).toBeNull();
  await expect.element(page.getByRole("button", { name: "Create account" })).toBeVisible();
});
