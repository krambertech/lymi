import { createAccountThroughDevForm } from "./auth";
import { e2eSiteUrl } from "./ports.mjs";
import { expect, test } from "./test";

const analyticsCookies = (cookies: { name: string }[]) =>
  cookies.filter((c) => /ph_|posthog|lymi_analytics/.test(c.name));

test("a public visit's source rides the Get started link into sign-up without cookies", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120_000);
  await page.goto(`${e2eSiteUrl}/teachers?utm_source=e2e-newsletter`);
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  const arrived = new URL(page.url());
  expect(arrived.searchParams.get("lp")).toBe("/teachers");
  expect(arrived.searchParams.get("utm_source")).toBe("e2e-newsletter");
  arrived.searchParams.set("dev", "1");
  await page.goto(arrived.toString());
  const signUp = page.waitForRequest((r) => r.url().endsWith("/api/auth/sign-up/email"));
  await createAccountThroughDevForm(
    page,
    `first-touch-${info.project.name}-${Date.now()}@example.test`,
  );
  expect(JSON.parse((await signUp).headers()["x-lymi-first-touch"] ?? "null")).toEqual({
    first_landing_page: "/teachers",
    utm_source: "e2e-newsletter",
  });
  expect(analyticsCookies(await context.cookies())).toEqual([]);
});
