import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { passwordProblem } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { safeProductReturnPath } from "../../shared/origins";
import { identifyApp } from "../components/app-mark";
import { Button } from "../components/button";
import { Input } from "../components/ui/input";
import {
  authClient,
  continueOAuthAuthorization,
  followOAuthRedirect,
  signInWithGoogle,
} from "../lib/auth";
import { useDocumentTitle } from "../lib/document-title";
import { passwordMessage } from "../lib/password-copy";
import { clearPersistedLearnerState } from "../lib/persisted";
import { minutesUntilRetry, tooManyAttempts } from "../lib/retry-after";
import type { CredentialValues, LoginMode } from "../views/login-view";
import { LoginView } from "../views/login-view";

/**
 * When an MCP client's authorize request needs a sign-in, the OAuth provider redirects here
 * with the signed authorization query, so `client_id` and `scope` are on the URL. A failed
 * sign-in comes back with `error`.
 */
const Search = z.object({
  client_id: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
  returnTo: z.string().optional(),
  /** Set on the link a confirmation email carries, so this page knows what just happened. */
  verify: z.coerce.string().pipe(z.literal("1")).optional(),
  /** Which form the panel opens on, so another screen can send a learner straight to it. */
  mode: z.enum(["sign-in", "sign-up", "forgot"]).optional(),
  /** Carried from a spent reset link, so the learner does not retype what they just used. */
  email: z.string().max(254).optional(),
  /** Keeps the local email/password helper out of the real sign-in experience. */
  dev: z.coerce.string().pipe(z.literal("1")).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: Search,
  component: Login,
});

/**
 * Turn a callback error into a sentence the learner can act on.
 *
 * Better Auth's OAuth callback redirects to `errorCallbackURL` with `?error=<code>`, where the
 * code is one of a fixed set or the message of an APIError with its spaces turned into
 * underscores (better-auth/dist/api/routes/callback.mjs).
 */
const RETRYABLE = new Set([
  "signup_disabled",
  "unable_to_create_user",
  "state_not_found",
  "invalid_callback_request",
  "no_code",
  "invalid_code",
  "unable_to_create_session",
  "unable_to_get_user_info",
]);
/** What Better Auth redirects a spent or forged confirmation link back with. */
const STALE_LINK = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"]);

function issueFor(code: string | undefined): MessageDescriptor | null {
  if (!code) return null;
  if (STALE_LINK.has(code)) return msg`That link no longer works. Sign in to get a new one.`;
  if (RETRYABLE.has(code)) return msg`Sign-in didn’t finish. Try again.`;
  // An unknown code is rarer than a blip, and there is nothing more useful to say about it.
  return msg`Sign-in didn’t finish. Try again, or use another account.`;
}

/**
 * What the confirmation link should bring the learner back to. The signed OAuth query rides
 * along so the MCP client's authorization can resume; a failure already on the URL does not,
 * because it belongs to the attempt the learner has just moved past.
 */
function verificationCallback(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("error");
  params.set("verify", "1");
  return `/login?${params.toString()}`;
}

type Notice = { title: ReactNode; body: ReactNode; actions?: ReactNode };

function Login() {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const {
    client_id: clientId,
    error,
    dev,
    verify,
    mode: openOn,
    email: known,
    returnTo: rawReturnTo,
  } = search;
  const returnTo = safeProductReturnPath(rawReturnTo);
  const [mode, setMode] = useState<LoginMode>(openOn ?? "sign-in");
  const [email, setEmail] = useState(known ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  /** A Google failure belongs beside the Google button, not with the form. */
  const [googleFailed, setGoogleFailed] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [resending, setResending] = useState(false);
  /** The learner already has an account, so the notice must not talk about creating one. */
  const [needsConfirming, setNeedsConfirming] = useState(false);
  const issue = issueFor(error);
  useDocumentTitle(t`Sign in`);

  // The client's own name, for an app we ship no mark for. Best-effort: the door still works
  // from the client_id host alone, so a failure here is not shown.
  const claimed = useQuery({
    queryKey: ["oauth-client-prelogin", clientId],
    enabled: Boolean(clientId),
    retry: false,
    queryFn: async () => {
      const res = await authClient.oauth2.publicClientPrelogin({ client_id: clientId ?? "" });
      return res.error ? null : (res.data?.client_name ?? null);
    },
  });

  const app = clientId ? identifyApp(clientId, claimed.data) : undefined;

  /**
   * A confirmed address already holds a session by the time the link lands here, so this
   * page's only job is to send the learner on: back to an MCP client's authorization, or to
   * where they started. A stale signed query leaves them signed in with the panel to read.
   */
  const resumed = useRef(false);
  useEffect(() => {
    if (verify !== "1" || error || resumed.current) return;
    resumed.current = true;
    void (async () => {
      const session = await authClient.getSession();
      if (!session.data) return;
      clearPersistedLearnerState({ keepQueued: true });
      queryClient.clear();
      if (clientId && (await continueOAuthAuthorization())) return;
      window.location.assign(returnTo);
    })();
  }, [verify, error, clientId, queryClient, returnTo]);

  function clearMessages() {
    setFailed(null);
    setGoogleFailed(null);
    setEmailError(null);
    setPasswordError(null);
  }

  function switchTo(next: LoginMode) {
    setMode(next);
    setNotice(null);
    setNeedsConfirming(false);
    clearMessages();
  }

  /** Every learner-typed failure a credential call can return, as one sentence. */
  function messageFor(
    failure: { code?: string | undefined; status?: number | undefined } | null,
  ): string {
    const code = failure?.code;
    if (failure?.status === 429) return i18n._(tooManyAttempts(minutesUntilRetry(failure)));
    switch (code) {
      case "INVALID_EMAIL_OR_PASSWORD":
        return t`That email and password don’t match.`;
      case "EMAIL_NOT_VERIFIED":
        return t`Confirm your email address first.`;
      case "PASSWORD_TOO_SHORT":
        return i18n._(passwordMessage("too-short"));
      case "PASSWORD_TOO_LONG":
        return i18n._(passwordMessage("too-long"));
      case "PASSWORD_TOO_GUESSABLE":
        return i18n._(passwordMessage("too-common"));
      case "INVALID_EMAIL":
        return t`Enter an email address, like you@example.com.`;
      default:
        return t`Couldn’t reach Lymi. Check your connection and try again.`;
    }
  }

  function checkInbox(address: string, resend: () => void | Promise<void>, again = false): Notice {
    return {
      title: again ? <Trans>Sent again</Trans> : <Trans>Check your inbox</Trans>,
      body: needsConfirming ? (
        <Trans>If {address} isn’t confirmed yet, a confirmation link is on the way.</Trans>
      ) : (
        <Trans>Check {address}. A message is on the way with the next step.</Trans>
      ),
      actions: (
        <>
          <Button size="sm" variant="secondary" loading={resending} onClick={() => void resend()}>
            <Trans>Send it again</Trans>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => switchTo("sign-in")}>
            <Trans>Back to sign in</Trans>
          </Button>
        </>
      ),
    };
  }

  async function signUp(values: CredentialValues) {
    const res = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.email.split("@")[0] ?? values.email,
      callbackURL: verificationCallback(window.location.search),
    });
    if (res.error) {
      const message = messageFor(res.error);
      if (res.error.code?.startsWith("PASSWORD_")) setPasswordError(message);
      else if (res.error.code === "INVALID_EMAIL") setEmailError(message);
      else setFailed(message);
      return;
    }
    setNeedsConfirming(false);
    setNotice(checkInbox(values.email, () => resendVerification(values)));
  }

  async function resendVerification(values: CredentialValues, first = false) {
    setResending(!first);
    try {
      const res = await authClient.sendVerificationEmail({
        email: values.email,
        callbackURL: verificationCallback(window.location.search),
      });
      if (res.error) {
        setNotice(null);
        setFailed(messageFor(res.error));
        return;
      }
    } catch {
      setNotice(null);
      setFailed(t`Couldn’t reach Lymi. Check your connection and try again.`);
      return;
    } finally {
      setResending(false);
    }
    clearMessages();
    setNotice(checkInbox(values.email, () => resendVerification(values), !first));
  }

  async function signIn(values: CredentialValues) {
    clearPersistedLearnerState({ keepQueued: true });
    const res = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (res.error) {
      if (res.error.code === "EMAIL_NOT_VERIFIED") {
        setNeedsConfirming(true);
        await resendVerification(values, true);
        return;
      }
      setFailed(messageFor(res.error));
      return;
    }
    queryClient.clear();
    if (followOAuthRedirect(res.data)) return;
    window.location.assign(returnTo);
  }

  async function forgot(values: CredentialValues) {
    const res = await authClient.requestPasswordReset({
      email: values.email,
      // The address rides along so the page can hand it to a password manager.
      redirectTo: `/reset-password?${new URLSearchParams({ email: values.email })}`,
    });
    if (res.error) {
      setFailed(messageFor(res.error));
      return;
    }
    const address = values.email;
    setNotice({
      title: <Trans>Check your inbox</Trans>,
      body: (
        <Trans>
          If {address} has a Lymi password, a reset link is on the way. It works for one hour.
        </Trans>
      ),
      actions: (
        <Button size="sm" variant="ghost" onClick={() => switchTo("sign-in")}>
          <Trans>Back to sign in</Trans>
        </Button>
      ),
    });
  }

  async function submit(values: CredentialValues) {
    clearMessages();
    const address = values.email.trim();
    if (!address.includes("@")) {
      setEmailError(t`Enter an email address, like you@example.com.`);
      return;
    }
    // Signing in checks nothing: an old password that no longer meets the rule must still
    // reach the reset that replaces it, rather than being refused by its own door.
    if (mode === "sign-up") {
      const problem = passwordProblem(values.password, address);
      if (problem) {
        setPasswordError(i18n._(passwordMessage(problem)));
        return;
      }
    }
    setSubmitting(true);
    try {
      const credentials = { email: address, password: values.password };
      if (mode === "sign-up") await signUp(credentials);
      else if (mode === "forgot") await forgot(credentials);
      else await signIn(credentials);
    } catch {
      setFailed(t`Couldn’t reach Lymi. Check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginView
      app={app}
      mode={mode}
      onModeChange={switchTo}
      pending={busy ? "google" : submitting ? "form" : undefined}
      email={email}
      onEmailChange={(value) => {
        setEmail(value);
        setEmailError(null);
      }}
      password={password}
      onPasswordChange={(value) => {
        setPassword(value);
        setPasswordError(null);
      }}
      onSubmit={submit}
      notice={notice ?? undefined}
      errors={{
        // The door's own failure: a Google attempt, or a callback that came back refused.
        door: googleFailed ?? (issue ? i18n._(issue) : undefined),
        form: failed,
        email: emailError,
        password: passwordError,
      }}
      onGoogle={async () => {
        setBusy(true);
        clearMessages();
        // The account coming back may not be the one whose cache is on this device.
        clearPersistedLearnerState({ keepQueued: true });
        try {
          // better-auth returns the failure rather than throwing, so a silent `await` here
          // left the button spinning and then stopping with nothing said.
          const res = await signInWithGoogle(returnTo);
          if (res.error) setGoogleFailed(t`Sign-in didn’t finish. Try again.`);
        } catch {
          setGoogleFailed(
            t`Couldn’t reach the sign-in service. Check your connection and try again.`,
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {import.meta.env.DEV && dev === "1" && <DevSignIn returnTo={returnTo} />}
    </LoginView>
  );
}

/** Local development only. Email + password against the local D1, no Google needed. */
function DevSignIn({ returnTo }: { returnTo: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("dev@lymi.local");
  const [password, setPassword] = useState("quiet-harbour-evening");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    // Creating issues no session while verification is required, so it is followed by a
    // sign-in. A local address is created already confirmed, so that sign-in succeeds; any
    // other address has to open the link in the outbox, which lands on `returnTo`.
    if (mode === "up") {
      await authClient.signUp.email({ email, password, name: "Dev", callbackURL: returnTo });
    }
    const res = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign in failed");
      return;
    }
    queryClient.clear();
    clearPersistedLearnerState({ keepQueued: true });
    if (followOAuthRedirect(res.data)) return;
    window.location.assign(returnTo);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-10 rounded-sm px-2 py-1 text-xs text-faint transition-colors duration-150 hoverable:hover:text-muted"
      >
        Dev sign-in
      </button>
    );
  }

  return (
    <form
      // Named so a browser test can tell these boxes from the real form's.
      aria-label="Dev sign-in"
      className="enter-fade edge mt-10 grid w-full max-w-72 gap-2 rounded-md bg-plate p-4 text-start"
      onSubmit={(e) => {
        e.preventDefault();
        void go("in");
      }}
    >
      <p className="text-xs font-medium text-muted">Dev sign-in (localhost only)</p>
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="username"
        aria-label="Email"
      />
      <Input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
        aria-label="Password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" type="submit" aria-disabled={busy}>
          Sign in
        </Button>
        <Button size="sm" variant="ghost" aria-disabled={busy} onClick={() => void go("up")}>
          Create account
        </Button>
      </div>
    </form>
  );
}
