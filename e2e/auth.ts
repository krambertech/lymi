import { type APIRequestContext, request } from "@playwright/test";
import { e2eProductUrl } from "./ports.mjs";
import { type E2EAccount, e2eEmail } from "./settings.mjs";
import { expect, type Page, type TestInfo } from "./test";

const password = "quiet-harbour-morning";

/** The name the dev email form gives a new account, and so the label on the learner menu. */
const learnerName = "Dev";

type StoredSession = Awaited<ReturnType<APIRequestContext["storageState"]>>;

/**
 * One session per disposable account, established on first use and restored into every journey
 * that account belongs to. The cache lives in this process alone, so it cannot outlast the D1
 * and KV that `scripts/e2e-server.mjs` rebuilds on every run: a session from an earlier run,
 * an earlier schema or an earlier auth configuration is never restored at all.
 */
const sessions = new Map<string, StoredSession>();

/**
 * Start already signed in as this scenario's disposable account, on the screen the journey is
 * about. Pass `landOn` only when the first thing the journey does is look at a screen: a journey
 * that seeds through the API first navigates itself, and rendering Today on the way costs it a
 * screen it never reads.
 *
 * The session comes from the same email endpoints the form posts to, so the account, the
 * allowlist and Better Auth are all real; only the walk through the form is skipped. A journey
 * whose subject is arriving drives the form instead, through `signInAsTestLearner`.
 */
export async function startAsTestLearner(
  page: Page,
  testInfo: TestInfo,
  account: E2EAccount,
  landOn?: string,
) {
  const email = emailFor(testInfo, account);
  const session = sessions.get(email) ?? (await establishSession(email));
  sessions.set(email, session);
  await page.context().addCookies(session.cookies);
  if (!landOn) return;

  await page.goto(landOn);
  await expect
    .poll(() => pathOf(page), {
      message: `the restored session for ${email} did not open ${landOn}`,
    })
    .toBe(landOn);
  if (landOn === "/today") await expectToday(page);
}

/** Sign in to this scenario's disposable account through the form, creating it on the first attempt. */
export async function signInAsTestLearner(
  page: Page,
  testInfo: TestInfo,
  account: E2EAccount,
  returnTo = "/today",
) {
  const email = emailFor(testInfo, account);

  await page.goto(`/login?${new URLSearchParams({ dev: "1", returnTo })}`);
  await page.getByRole("button", { name: "Dev sign-in", exact: true }).click();
  // The real door offers the same labels, so every control here comes from the dev panel.
  const panel = page.getByRole("form", { name: "Dev sign-in" });
  await panel.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await panel.getByRole("textbox", { name: "Password", exact: true }).fill(password);

  const signedIn = () =>
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "POST" &&
        candidate.url().endsWith("/api/auth/sign-in/email"),
    );

  const first = signedIn();
  await panel.getByRole("button", { name: "Sign in", exact: true }).click();
  const signIn = await first;
  if (signIn.status() === 401) {
    // No account yet. Creating one signs in straight after, because a local address is
    // created already confirmed.
    const created = signedIn();
    await panel.getByRole("button", { name: "Create account", exact: true }).click();
    const retry = await created;
    expect(retry.ok(), `Sign in after creating failed with HTTP ${retry.status()}`).toBe(true);
  } else {
    expect(signIn.ok(), `Sign in failed with HTTP ${signIn.status()}`).toBe(true);
  }

  await expect.poll(() => pathOf(page)).toBe(returnTo);
  if (returnTo === "/today") await expectToday(page);
}

function emailFor(testInfo: TestInfo, account: E2EAccount) {
  return e2eEmail(account, testInfo.project.name, testInfo.retry, testInfo.repeatEachIndex);
}

function pathOf(page: Page) {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
}

/**
 * The due card names the state: the count on an account with cards, nothing due, or the
 * first-run line on a fresh one. Match it in any state, specific enough that another screen
 * cannot pass.
 */
async function expectToday(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Today", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: /due|Getting started|Start with a deck|No cards yet|Nothing due/,
    }),
  ).toBeVisible();
}

/**
 * Establish the account's session through Better Auth's own email endpoints, creating the
 * account on first use. Creating issues no session while verification is required, but a local
 * address is created already confirmed, so the sign-in straight after succeeds.
 */
async function establishSession(email: string): Promise<StoredSession> {
  const api = await request.newContext({
    baseURL: e2eProductUrl,
    // Better Auth trusts the product origin. A browser sends it, so this sends it too.
    extraHTTPHeaders: { origin: e2eProductUrl },
  });
  try {
    const signIn = () => api.post("/api/auth/sign-in/email", { data: { email, password } });

    let response = await signIn();
    if (response.status() === 401) {
      const created = await api.post("/api/auth/sign-up/email", {
        data: { email, password, name: learnerName },
      });
      expect(created.ok(), `Creating ${email} failed with HTTP ${created.status()}`).toBe(true);
      response = await signIn();
    }
    expect(response.ok(), `Sign in as ${email} failed with HTTP ${response.status()}`).toBe(true);

    const state = await api.storageState();
    expect(state.cookies.length, `Sign in as ${email} set no cookie`).toBeGreaterThan(0);
    return state;
  } finally {
    await api.dispose();
  }
}

/** Ask the dev email form to create an account, without waiting for what it leads to. */
async function submitDevSignUp(page: Page, email: string) {
  await page.getByRole("button", { name: "Dev sign-in", exact: true }).click();
  const panel = page.getByRole("form", { name: "Dev sign-in" });
  await panel.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await panel.getByRole("textbox", { name: "Password", exact: true }).fill(password);
  const created = page.waitForResponse((r) => r.url().endsWith("/api/auth/sign-up/email"));
  await panel.getByRole("button", { name: "Create account", exact: true }).click();
  await created;
}

/**
 * Create a local account through the dev email form, as a classmate arriving on a join or add
 * page would. An address outside `@lymi.local` has to be confirmed, so this opens the link the
 * local outbox holds; that link signs the learner in and lands them where they started.
 */
export async function createAccountThroughDevForm(page: Page, email: string) {
  await submitDevSignUp(page, email);
  await page.goto(await confirmationLink(page, email));
}

/** The confirmation link the local outbox holds for this address. */
async function confirmationLink(page: Page, email: string): Promise<string> {
  let message: { kind: string; text: string } | null = null;
  await expect
    .poll(
      async () => {
        const response = await page.request.post("/api/dev/outbox", { data: { to: email } });
        if (!response.ok()) return null;
        ({ message } = (await response.json()) as { message: typeof message });
        return message?.kind ?? null;
      },
      { message: `no confirmation email for ${email}` },
    )
    .toBe("verify-email");
  const link = /https?:\/\/\S+/.exec(message?.text ?? "")?.[0];
  expect(link, "no link in the confirmation email").toBeDefined();
  return link as string;
}
