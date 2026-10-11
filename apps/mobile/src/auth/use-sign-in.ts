import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type PasswordProblem,
  passwordProblem,
} from "@lymi/core";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { API_URL, authClient } from "./client";

/**
 * Where the door is. `doors` offers the ways in; `code` asks for the code a new account is
 * confirmed with; the rest are the email forms.
 */
export type Step = "doors" | "sign-in" | "sign-up" | "code" | "forgot";

type Failure = { code?: string | undefined; status?: number | undefined } | null;

const UNREACHABLE = "Couldn’t reach Lymi. Check your connection and try again.";

/** The web's sentences for the same failures, so the phone and the web say one thing. */
function messageFor(failure: Failure): string {
  if (failure?.status === 429) return "Too many attempts. Try again later.";
  switch (failure?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match.";
    case "INVALID_EMAIL":
      return "Enter an email address, like you@example.com.";
    case "INVALID_OTP":
      return "That code doesn’t match. Check the email and try again.";
    case "OTP_EXPIRED":
      return "That code has expired. Send a new one.";
    case "TOO_MANY_ATTEMPTS":
      return "Too many tries with this code. Send a new one.";
    default:
      return UNREACHABLE;
  }
}

/** The web's `passwordMessage`, until the phone has the Lingui catalogs. */
function passwordMessage(problem: PasswordProblem): string {
  switch (problem) {
    case "too-short":
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "too-long":
      return `Use at most ${MAX_PASSWORD_LENGTH} characters.`;
    case "too-common":
      return "That password is too easy to guess. Try another.";
    case "from-address":
      return "Don’t use your email address in your password.";
    case "from-lymi":
      return "Don’t use “Lymi” in your password.";
  }
}

const PASSWORD_CODES: Record<string, PasswordProblem> = {
  PASSWORD_TOO_SHORT: "too-short",
  PASSWORD_TOO_LONG: "too-long",
  PASSWORD_TOO_GUESSABLE: "too-common",
};

export interface Notice {
  title: string;
  body: string;
}

/**
 * The phone's front door: Google, or an email and password. A new account is confirmed with a
 * code from its email, because a link would open in Safari rather than here.
 */
export function useSignIn() {
  const [step, setStep] = useState<Step>("doors");
  const [email, setEmailValue] = useState("");
  const [password, setPasswordValue] = useState("");
  const [code, setCodeValue] = useState("");
  const [pending, setPending] = useState<"google" | "form" | "resend" | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    code?: string;
  }>({});
  const [notice, setNotice] = useState<Notice | null>(null);

  function clear() {
    setGoogleError(null);
    setFormError(null);
    setFieldErrors({});
  }

  function fail(set: () => void) {
    set();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  async function google() {
    clear();
    setPending("google");
    try {
      // The session lands in SecureStore when the browser comes back; the guard then opens Today.
      const res = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (res.error) fail(() => setGoogleError("Sign-in didn’t finish. Try again."));
    } catch {
      fail(() =>
        setGoogleError("Couldn’t reach the sign-in service. Check your connection and try again."),
      );
    } finally {
      setPending(null);
    }
  }

  async function sendCode(address: string) {
    const res = await authClient.emailOtp.sendVerificationOtp({
      email: address,
      type: "email-verification",
    });
    if (res.error) throw res.error;
  }

  async function signIn(address: string) {
    // Signing in checks nothing about the password: an old one must still reach its reset.
    const res = await authClient.signIn.email({ email: address, password });
    if (!res.error) return;
    if (res.error.code === "EMAIL_NOT_VERIFIED") {
      await sendCode(address);
      setCode("");
      setStep("code");
      return;
    }
    fail(() => setFormError(messageFor(res.error)));
  }

  async function signUp(address: string) {
    const problem = passwordProblem(password, address);
    if (problem) return fail(() => setFieldErrors({ password: passwordMessage(problem) }));
    // The Worker answers a taken address exactly as a free one, and mails its owner instead.
    const res = await authClient.signUp.email({
      email: address,
      password,
      name: address.split("@")[0] ?? address,
    });
    if (res.error) {
      const passwordCode = PASSWORD_CODES[res.error.code ?? ""];
      if (passwordCode)
        return fail(() => setFieldErrors({ password: passwordMessage(passwordCode) }));
      return fail(() => setFormError(messageFor(res.error)));
    }
    setCode("");
    setStep("code");
  }

  async function confirm(address: string) {
    const otp = code.replace(/\D/g, "");
    if (otp.length !== 6) return fail(() => setFieldErrors({ code: "Enter the 6-digit code." }));
    const res = await authClient.emailOtp.verifyEmail({ email: address, otp });
    if (res.error) fail(() => setFieldErrors({ code: messageFor(res.error) }));
  }

  async function forgot(address: string) {
    const res = await authClient.requestPasswordReset({
      email: address,
      // The reset page is the web's, which hands the address to a password manager.
      redirectTo: `/reset-password?${new URLSearchParams({ email: address })}`,
    });
    if (res.error) return fail(() => setFormError(messageFor(res.error)));
    setNotice({
      title: "Check your inbox",
      body: `If ${address} has a Lymi password, a reset link is on the way. It works for one hour.`,
    });
  }

  async function submit() {
    clear();
    const address = email.trim();
    if (!address.includes("@")) {
      return fail(() => setFieldErrors({ email: "Enter an email address, like you@example.com." }));
    }
    setPending("form");
    try {
      if (step === "sign-up") await signUp(address);
      else if (step === "code") await confirm(address);
      else if (step === "forgot") await forgot(address);
      else await signIn(address);
    } catch (error) {
      fail(() => setFormError(messageFor(error as Failure)));
    } finally {
      setPending(null);
    }
  }

  async function resend() {
    clear();
    setPending("resend");
    try {
      await sendCode(email.trim());
      setNotice({ title: "Sent again", body: `A new code is on its way to ${email.trim()}.` });
    } catch (error) {
      fail(() => setFormError(messageFor(error as Failure)));
    } finally {
      setPending(null);
    }
  }

  function goTo(next: Step) {
    clear();
    setNotice(null);
    setStep(next);
  }

  function setCode(value: string) {
    setCodeValue(value);
    setFieldErrors((errors) => ({ ...errors, code: undefined }));
  }

  return {
    step,
    goTo,
    email,
    setEmail: (value: string) => {
      setEmailValue(value);
      setFieldErrors((errors) => ({ ...errors, email: undefined }));
    },
    password,
    setPassword: (value: string) => {
      setPasswordValue(value);
      setFieldErrors((errors) => ({ ...errors, password: undefined }));
    },
    code,
    setCode,
    pending,
    errors: { google: googleError, form: formError, ...fieldErrors },
    notice,
    google,
    submit,
    resend,
  };
}

export type SignIn = ReturnType<typeof useSignIn>;

/**
 * Local development only: become a persona without a password, as `/api/dev/sign-in` does in a
 * browser. The Worker answers 404 to it anywhere but a loopback origin.
 */
export async function devSignIn(persona = "learner") {
  await authClient.$fetch(`${API_URL}/api/dev/sign-in?as=${persona}`, { method: "POST" });
  await authClient.getSession();
}
