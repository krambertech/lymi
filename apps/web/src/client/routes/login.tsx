import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { identifyApp } from "../components/AppMark";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { authClient, followOAuthRedirect, signInWithGoogle } from "../lib/auth";
import { LoginView } from "../views/LoginView";

/**
 * When an MCP client's authorize request needs a sign-in, the OAuth provider redirects here
 * with the signed authorization query, so `client_id` and `scope` are on the URL. A failed
 * sign-in comes back with `error`.
 */
const Search = z.object({
  client_id: z.string().optional(),
  scope: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: Search,
  component: Login,
});

/** Sign-in failures the learner can act on. Anything else gets the general sentence. */
function reasonFor(code: string | undefined): string | null {
  if (!code) return null;
  if (/forbidden|not.on.the.list|signup|unable_to_create_user/i.test(code)) {
    return "That account is not on the invite list. Lymi is private for now — sign in with the invited account.";
  }
  if (/state|expired|invalid_request/i.test(code)) {
    return "That sign-in link expired. Try again.";
  }
  return "Sign in did not finish. Try again.";
}

function Login() {
  const { client_id: clientId, error } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

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

  return (
    <LoginView
      app={app}
      busy={busy}
      error={failed ?? reasonFor(error)}
      onGoogle={async () => {
        setBusy(true);
        setFailed(null);
        try {
          await signInWithGoogle();
        } catch {
          setFailed("Could not reach Google. Check your connection and try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {import.meta.env.DEV && <DevSignIn />}
    </LoginView>
  );
}

/** Local development only. Email + password against the local D1, no Google needed. */
function DevSignIn() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("dev@lymi.local");
  const [password, setPassword] = useState("lymi-dev-password");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    const res =
      mode === "up"
        ? await authClient.signUp.email({ email, password, name: "Dev" })
        : await authClient.signIn.email({ email, password });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Sign in failed");
      return;
    }
    if (followOAuthRedirect(res.data)) return;
    navigate({ to: "/" });
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
        <Button size="sm" type="submit" disabled={busy}>
          Sign in
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void go("up")}>
          Create account
        </Button>
      </div>
    </form>
  );
}
