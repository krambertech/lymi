import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { passwordProblem } from "@lymi/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod";
import { safeProductReturnPath } from "../../shared/origins";
import { identifyApp } from "../components/app-mark";
import { Button } from "../components/button";
import { Input } from "../components/ui/input";
import {
  authClient,
  continueOAuthAuthorization,
  followOAuthRedirect,
  signInWithApple,
  signInWithGoogle,
} from "../lib/auth";
import { desktop } from "../lib/desktop";
import { useDocumentTitle } from "../lib/document-title";
import { type FormErrors, type LoginFlow, loginFlow, type SentNotice } from "../lib/login-flow";
import { passwordMessage } from "../lib/password-copy";
import { clearPersistedLearnerState } from "../lib/persisted";
import { minutesUntilRetry, tooManyAttempts } from "../lib/retry-after";
import { firstTouchHeaders } from "../lib/telemetry";
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
  const [flow, dispatch] = useReducer(loginFlow, openOn, (mode): LoginFlow => ({
    status: "form",
    mode: mode ?? "sign-in",
    errors: {},
  }));
  const { mode } = flow;
  const attempts = useRef(0);
  const [email, setEmail] = useState(known ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  /** A provider failure belongs beside the sign-in buttons. */
  const [socialFailed, setSocialFailed] = useState<string | null>(null);
  const issue = issueFor(error);
  useDocumentTitle(
    mode === "sign-up"
      ? t`Create account`
      : mode === "forgot"
        ? t`Reset your password`
        : t`Sign in`,
  );

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

  function switchTo(next: LoginMode) {
    dispatch({ type: "switch", mode: next });
    setSocialFailed(null);
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

  const offline = () => t`Couldn’t reach Lymi. Check your connection and try again.`;

  /** What a submit came to: the form's errors, a notice, or nothing while the page moves on. */
  type Outcome = { errors: FormErrors } | { notice: SentNotice } | null;

  /** Sends the confirmation link, answering with the failure to show, if any. */
  async function sendVerification(address: string): Promise<string | null> {
    try {
      const res = await authClient.sendVerificationEmail({
        email: address,
        callbackURL: verificationCallback(window.location.search),
      });
      return res.error ? messageFor(res.error) : null;
    } catch {
      return offline();
    }
  }

  async function resend(address: string) {
    dispatch({ type: "resend" });
    const error = await sendVerification(address);
    dispatch(error ? { type: "resend-fail", error } : { type: "resent" });
  }

  async function signUp(values: CredentialValues): Promise<Outcome> {
    const res = await authClient.signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.email.split("@")[0] ?? values.email,
        callbackURL: verificationCallback(window.location.search),
      },
      { headers: firstTouchHeaders() },
    );
    if (res.error) {
      const message = messageFor(res.error);
      if (res.error.code?.startsWith("PASSWORD_")) return { errors: { password: message } };
      if (res.error.code === "INVALID_EMAIL") return { errors: { email: message } };
      return { errors: { form: message } };
    }
    return { notice: { kind: "confirm", address: values.email, again: false, known: false } };
  }

  async function signIn(values: CredentialValues): Promise<Outcome> {
    clearPersistedLearnerState({ keepQueued: true });
    const res = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (res.error) {
      if (res.error.code === "EMAIL_NOT_VERIFIED") {
        const error = await sendVerification(values.email);
        if (error) return { errors: { form: error } };
        return { notice: { kind: "confirm", address: values.email, again: false, known: true } };
      }
      return { errors: { form: messageFor(res.error) } };
    }
    queryClient.clear();
    if (followOAuthRedirect(res.data)) return null;
    window.location.assign(returnTo);
    return null;
  }

  async function forgot(values: CredentialValues): Promise<Outcome> {
    const res = await authClient.requestPasswordReset({
      email: values.email,
      // The address rides along so the page can hand it to a password manager.
      redirectTo: `/reset-password?${new URLSearchParams({ email: values.email })}`,
    });
    if (res.error) return { errors: { form: messageFor(res.error) } };
    return { notice: { kind: "reset", address: values.email } };
  }

  async function submit(values: CredentialValues) {
    if (busy || flow.status !== "form") return;
    setSocialFailed(null);
    const address = values.email.trim();
    if (!address.includes("@")) {
      dispatch({
        type: "show",
        errors: { email: t`Enter an email address, like you@example.com.` },
      });
      return;
    }
    // Signing in checks nothing: an old password that no longer meets the rule must still
    // reach the reset that replaces it, rather than being refused by its own door.
    if (mode === "sign-up") {
      const problem = passwordProblem(values.password, address);
      if (problem) {
        dispatch({ type: "show", errors: { password: i18n._(passwordMessage(problem)) } });
        return;
      }
    }
    const attempt = ++attempts.current;
    dispatch({ type: "submit", attempt });
    let outcome: Outcome;
    try {
      const credentials = { email: address, password: values.password };
      outcome =
        mode === "sign-up"
          ? await signUp(credentials)
          : mode === "forgot"
            ? await forgot(credentials)
            : await signIn(credentials);
    } catch {
      outcome = { errors: { form: offline() } };
    }
    // The page is moving on; the form settles as it did, so a page brought back from history works.
    if (!outcome) {
      dispatch({ type: "fail", attempt, errors: {} });
      return;
    }
    dispatch(
      "notice" in outcome
        ? { type: "send", attempt, notice: outcome.notice }
        : { type: "fail", attempt, errors: outcome.errors },
    );
  }

  function noticeFor(notice: SentNotice, resending: boolean) {
    const back = (
      <Button size="sm" variant="ghost" onClick={() => switchTo("sign-in")}>
        <Trans>Back to sign in</Trans>
      </Button>
    );
    const address = notice.address;
    if (notice.kind === "reset") {
      return {
        title: <Trans>Check your inbox</Trans>,
        body: (
          <Trans>
            If {address} has a Lymi password, a reset link is on the way. It works for one hour.
          </Trans>
        ),
        actions: back,
      };
    }
    return {
      title: notice.again ? <Trans>Sent again</Trans> : <Trans>Check your inbox</Trans>,
      body: notice.known ? (
        <Trans>If {address} isn’t confirmed yet, a confirmation link is on the way.</Trans>
      ) : (
        <Trans>Check {address}. A message is on the way with the next step.</Trans>
      ),
      actions: (
        <>
          <Button
            size="sm"
            variant="secondary"
            loading={resending}
            onClick={() => void resend(address)}
          >
            <Trans>Send it again</Trans>
          </Button>
          {back}
        </>
      ),
    };
  }

  function clearMessages() {
    setSocialFailed(null);
    dispatch({ type: "show", errors: {} });
  }

  async function social(provider: "google" | "apple") {
    if (busy || flow.status === "submitting") return;
    // Google refuses an app's window, so the Mac app signs in in the browser, which hands back.
    const mac = desktop();
    if (mac?.signIn) {
      clearMessages();
      mac.signIn(provider);
      return;
    }
    setBusy(provider);
    clearMessages();
    clearPersistedLearnerState({ keepQueued: true });
    try {
      const res = await (provider === "apple" ? signInWithApple : signInWithGoogle)(returnTo);
      if (res.error) setSocialFailed(t`Sign-in didn’t finish. Try again.`);
    } catch {
      setSocialFailed(t`Couldn’t reach the sign-in service. Check your connection and try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <LoginView
      app={app}
      mode={mode}
      onModeChange={switchTo}
      pending={busy ?? (flow.status === "submitting" ? "form" : undefined)}
      email={email}
      onEmailChange={(value) => {
        setEmail(value);
        if (flow.status === "form" && flow.errors.email)
          dispatch({ type: "show", errors: { ...flow.errors, email: undefined } });
      }}
      password={password}
      onPasswordChange={(value) => {
        setPassword(value);
        if (flow.status === "form" && flow.errors.password)
          dispatch({ type: "show", errors: { ...flow.errors, password: undefined } });
      }}
      onSubmit={submit}
      notice={flow.status === "sent" ? noticeFor(flow.notice, flow.resending) : undefined}
      errors={{
        // The door's own failure: a Google attempt, or a callback that came back refused.
        door: socialFailed ?? (issue ? i18n._(issue) : undefined),
        ...(flow.status === "form" ? flow.errors : {}),
      }}
      onGoogle={() => social("google")}
      onApple={() => social("apple")}
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
      await authClient.signUp.email(
        { email, password, name: "Dev", callbackURL: returnTo },
        { headers: firstTouchHeaders() },
      );
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
        className="mt-10 rounded-sm px-2 py-1 text-xs text-ink-faint transition-colors duration-150 hoverable:hover:text-ink-muted"
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
      <p className="text-xs font-medium text-ink-muted">Dev sign-in (localhost only)</p>
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
