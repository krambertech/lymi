import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const title = "Delete account";

const stack = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../../../apps/mobile/.expo/verify-phone.json"),
    "utf8",
  ),
);

/** A second session of the persona, which the flow's script uses to delete the account. */
export async function env({ before }) {
  const response = await fetch(`${stack.worker}/api/dev/sign-in?as=learner`, { method: "POST" });
  if (!response.ok) throw new Error(`Dev sign-in answered HTTP ${response.status}`);
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { WORKER: stack.worker, COOKIE: cookie, EMAIL: before.user.email };
}

/** Every session of the account ended with it, the runner's own included. */
export async function check({ api, poll }) {
  return poll(async () => {
    try {
      await api("/api/me");
    } catch (error) {
      if (/HTTP 401/.test(error.message)) return { me: 401 };
      throw error;
    }
    throw new Error("/api/me still answers for the deleted account");
  });
}
