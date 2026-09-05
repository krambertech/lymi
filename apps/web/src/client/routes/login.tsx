import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Field";
import { authClient, followOAuthRedirect, signInWithGoogle } from "../lib/auth";
import { LoginView } from "../views/LoginView";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <LoginView
      busy={busy}
      error={error}
      onGoogle={async () => {
        setBusy(true);
        setError(undefined);
        try {
          // better-auth returns the failure rather than throwing, so a silent `await` here
          // left the button spinning and then stopping with nothing said.
          const res = await signInWithGoogle();
          if (res.error) setError("Sign-in didn’t go through. Try again.");
        } catch {
          setError("Can’t reach the sign-in service. Check your connection.");
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

  return (
    <form
      className="mt-10 grid w-full max-w-72 gap-2 rounded-lg border border-dashed border-edge-2 p-4 text-left"
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
