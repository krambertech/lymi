import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { safeProductReturnPath } from "../../shared/origins";
import { identifyApp } from "../components/app-mark";
import { Button } from "../components/button";
import { Input } from "../components/ui/input";
import {
  authClient,
  continueOAuthAuthorization,
  followOAuthRedirect,
  MIN_PASSWORD_LENGTH,
  signInWithGoogle,
} from "../lib/auth";
import { useDocumentTitle } from "../lib/document-title";
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
 * underscores (better-auth/dist/api/routes/callback.mjs). The allowlist in server/auth.ts
 * throws such an APIError, so its message arrives here underscored.
 */
const BLOCKED = new Set([
  // What the allowlist message becomes on the way here. Keep the two in step.
  "This_is_a_private_app._Your_account_is_not_on_the_list.",
  "signup_disabled",
  "unable_to_create_user",
]);
const RETRYABLE = new Set([
  "state_not_found",
  "invalid_callback_request",
  "no_code",
  "invalid_code",
  "unable_to_create_session",
  "unable_to_get_user_info",
]);
/** What Better Auth redirects a spent or forged confirmation link back with. */
const STALE_LINK = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"]);

interface SignInIssue {
  message: MessageDescriptor;
  blocked: boolean;
}

function issueFor(code: string | undefined): SignInIssue | null {
  if (!code) return null;
  if (STALE_LINK.has(code)) {
    return {
      message: msg`That confirmation link no longer works. Sign in to get a new one.`,
      blocked: false,
    };
  }
  if (BLOCKED.has(code) || /not.on.the.list/i.test(code)) {
    return {
      message: msg`This account has not been invited. Request an invitation, or try another account.`,
      blocked: true,
    };
  }
  if (RETRYABLE.has(code)) {
    return { message: msg`Sign-in didn’t finish. Try again.`, blocked: false };
  }
  // An unknown code is more often a blocked account than a blip, so do not promise a retry
  // will work.
  return {
    message: msg`Sign-in didn’t finish. Try again. If you haven’t been invited, request an invitation.`,
    blocked: false,
  };
}

/** What the confirmation link should bring the learner back to, with this page reading the result. */
function verificationCallback(search: string): string {
  const params = new URLSearchParams(search);
  params.set("verify", "1");
  return `/login?${params.toString()}`;
}

type Notice = { title: React.ReactNode; body: React.ReactNode; actions?: React.ReactNode };

function Login() {
  const { t, i18n } = useLingui();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const { client_id: clientId, error, dev, verify, returnTo: rawReturnTo } = search;
  const returnTo = safeProductReturnPath(rawReturnTo);
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
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

  /** A confirmed address already holds a session by the time this page loads. */
  const confirmed = useQuery({
    queryKey: ["login-confirmed", verify],
    enabled: verify === "1" && !error,
    retry: false,
    queryFn: async () => {
      const session = await authClient.getSession();
      if (!session.data) return null;
      clearPersistedLearnerState();
      queryClient.clear();
      if (clientId && (await continueOAuthAuthorization())) return null;
      window.location.assign(returnTo);
      return null;
    },
  });

  function clearMessages() {
    setFailed(null);
    setEmailError(null);
    setPasswordError(null);
  }

  function switchTo(next: LoginMode) {
    setMode(next);
    setNotice(null);
    clearMessages();
  }

  /** Every learner-typed failure a credential call can return, as one sentence. */
  function messageFor(
    error: { code?: string | undefined; status?: number | undefined } | null,
  ): string {
    const code = error?.code;
    if (error?.status === 429) return i18n._(tooManyAttempts(minutesUntilRetry(error)));
    switch (code) {
      case "INVALID_EMAIL_OR_PASSWORD":
        return t`That email and password don’t match. Try again, or reset your password.`;
      case "EMAIL_NOT_VERIFIED":
        return t`Confirm your email address first. Check your inbox for the link.`;
      case "PASSWORD_TOO_SHORT":
        return t`Use at least ${MIN_PASSWORD_LENGTH} characters.`;
      case "PASSWORD_TOO_LONG":
        return t`That password is too long.`;
      case "INVALID_EMAIL":
        return t`Enter an email address, such as you@example.com.`;
      default:
        return t`Couldn’t reach Lymi. Check your connection and try again.`;
    }
  }

  function checkInbox(address: string, resend: () => void | Promise<void>): Notice {
    return {
      title: <Trans>Check your inbox</Trans>,
      body: (
        <Trans>
          If {address} can create a Lymi account, a link to confirm it is on the way. Open it to
          finish.
        </Trans>
      ),
      actions: (
        <>
          <Button size="sm" variant="secondary" onClick={() => void resend()}>
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
    setNotice(checkInbox(values.email, () => resendVerification(values)));
  }

  async function resendVerification(values: CredentialValues) {
    await authClient.sendVerificationEmail({
      email: values.email,
      callbackURL: verificationCallback(window.location.search),
    });
    setNotice(checkInbox(values.email, () => resendVerification(values)));
  }

  async function signIn(values: CredentialValues) {
    clearPersistedLearnerState();
    const res = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (res.error) {
      if (res.error.code === "EMAIL_NOT_VERIFIED") {
        await resendVerification(values);
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
      redirectTo: "/reset-password",
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
          If {address} has a Lymi password, a link to set a new one is on the way. The link works
          for one hour.
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
      setEmailError(t`Enter an email address, such as you@example.com.`);
      return;
    }
    if (mode !== "forgot" && values.password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
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
      busy={busy || confirmed.isFetching}
      submitting={submitting}
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
      emailError={emailError}
      passwordError={passwordError}
      notice={notice ?? undefined}
      // `failed` is this attempt; `error` on the URL is a callback that came back refused.
      error={failed ?? (issue ? i18n._(issue.message) : undefined)}
      blocked={!failed && issue?.blocked}
      onGoogle={async () => {
        setBusy(true);
        clearMessages();
        // The account coming back may not be the one whose cache is on this device.
        clearPersistedLearnerState();
        try {
          // better-auth returns the failure rather than throwing, so a silent `await` here
          // left the button spinning and then stopping with nothing said.
          const res = await signInWithGoogle(returnTo);
          if (res.error) setFailed(t`Sign-in didn’t finish. Try again.`);
        } catch {
          setFailed(t`Couldn’t reach the sign-in service. Check your connection and try again.`);
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
  const [password, setPassword] = useState("lymi-dev-password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    // Creating issues no session while verification is required, so it is followed by a
    // sign-in. A local address is created already confirmed, so that sign-in succeeds.
    if (mode === "up") await authClient.signUp.email({ email, password, name: "Dev" });
    const res = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign in failed");
      return;
    }
    queryClient.clear();
    clearPersistedLearnerState();
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
      className="enter-fade edge mt-10 grid w-full max-w-72 gap-2 rounded-md bg-plate p-4 text-left"
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
