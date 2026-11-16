import { expect, test } from "vitest";
import { loginFlow } from "./login-flow";

test("an answer to a submit the learner switched away from changes nothing", () => {
  const submitting = loginFlow(
    { status: "form", mode: "sign-in", errors: {} },
    { type: "submit", attempt: 1 },
  );
  const switched = loginFlow(submitting, { type: "switch", mode: "sign-up" });
  expect(loginFlow(switched, { type: "fail", attempt: 1, errors: { form: "No" } })).toBe(switched);
});

test("a resend that answers after Back to sign in leaves the form alone", () => {
  const sent = {
    status: "sent",
    mode: "sign-in",
    notice: { kind: "confirm", address: "a@b.c", again: false, known: true },
    resending: false,
  } as const;
  const resending = loginFlow(sent, { type: "resend" });
  expect(resending).toMatchObject({ resending: true });
  const back = loginFlow(resending, { type: "switch", mode: "sign-in" });
  expect(loginFlow(back, { type: "resent" })).toBe(back);
  expect(loginFlow(resending, { type: "resent" })).toMatchObject({
    resending: false,
    notice: { again: true },
  });
});
