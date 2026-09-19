import { e2eInboxEmail } from "./settings.mjs";
import { expect, type Page, type TestInfo, test } from "./test";

const PASSWORD = "quiet-harbour-morning";
const NEW_PASSWORD = "quiet-harbour-midnight";

function address(account: "password-account" | "password-reset", testInfo: TestInfo) {
  return e2eInboxEmail(account, testInfo.project.name, testInfo.retry, testInfo.repeatEachIndex);
}

/** The link the last message to this address carried, read from the local outbox. */
async function linkFrom(page: Page, email: string, kind: string) {
  const response = await page.request.post("/api/dev/outbox", { data: { to: email } });
  expect(response.ok(), `no message for ${email}`).toBe(true);
  const { message } = (await response.json()) as { message: { kind: string; text: string } };
  expect(message.kind).toBe(kind);
  const link = /https?:\/\/\S+/.exec(message.text)?.[0];
  expect(link, `no link in the ${kind} message`).toBeDefined();
  return link as string;
}

async function createAccount(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Create an account", exact: true }).click();
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
}

test("a new address signs up, confirms from the email and lands in the app", async ({
  page,
}, testInfo) => {
  const email = address("password-account", testInfo);
  await createAccount(page, email);

  // Nothing is granted until the address is confirmed.
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  await page.goto(await linkFrom(page, email, "verify-email"));
  await expect.poll(() => new URL(page.url()).pathname).toBe("/today");
  await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();

  // The confirmed password now opens the door on its own.
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/today");
});

test("a forgotten password is reset from the email, and the old one stops working", async ({
  page,
}, testInfo) => {
  const email = address("password-reset", testInfo);
  await createAccount(page, email);
  await page.goto(await linkFrom(page, email, "verify-email"));
  await expect.poll(() => new URL(page.url()).pathname).toBe("/today");

  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot your password?", exact: true }).click();
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  await page.goto(await linkFrom(page, email, "reset-password"));
  await page.getByRole("textbox", { name: "New password", exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Save password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your password is set" })).toBeVisible();

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("don’t match")).toBeVisible();

  await page.getByRole("textbox", { name: "Password", exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/today");
});
