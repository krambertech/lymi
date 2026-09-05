import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { authClient, followOAuthRedirect, signInWithGoogle } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center pt-safe pb-safe">
      <Lantern className="size-28 text-ink" flicker halo />
      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em]">lymi</h1>
      <p className="max-w-[28ch] text-[15px] text-muted">Vocabulary you carry with you.</p>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 min-w-56"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGoogle();
          } finally {
            setBusy(false);
          }
        }}
      >
        Continue with Google
      </Button>
      <p className="mt-2 text-[12.5px] text-muted">
        Private for now. Only invited accounts can sign in.
      </p>
      {import.meta.env.DEV && <DevSignIn />}
    </div>
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
      className="mt-10 grid w-full max-w-72 gap-2 rounded-xl border border-dashed border-border-strong p-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void go("in");
      }}
    >
      <p className="text-[12px] font-semibold text-muted">Dev sign-in (localhost only)</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        autoComplete="username"
        className="h-10 rounded-md border border-border-strong bg-bg px-3 text-[16px]"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
        className="h-10 rounded-md border border-border-strong bg-bg px-3 text-[16px]"
      />
      {error && <p className="text-[13px] text-amber-text">{error}</p>}
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
