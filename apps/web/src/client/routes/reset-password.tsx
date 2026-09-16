import { useLingui } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { authClient, MIN_PASSWORD_LENGTH } from "../lib/auth";
import { useDocumentTitle } from "../lib/document-title";
import { clearPersistedLearnerState } from "../lib/persisted";
import { minutesUntilRetry, tooManyAttempts } from "../lib/retry-after";
import { ResetPasswordView } from "../views/reset-password-view";

/**
 * Better Auth's reset link goes to its own endpoint first, which checks the token and then
 * redirects here with `token` when it holds and `error` when it does not.
 */
const Search = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
  /** Whose password this is, so a password manager updates the entry it already holds. */
  email: z.string().max(254).optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: Search,
  component: ResetPassword,
});

function ResetPassword() {
  const { t, i18n } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token, error: linkError, email } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  useDocumentTitle(t`Set a new password`);

  const expired = !token || Boolean(linkError);

  async function submit() {
    setPasswordError(null);
    setFailed(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) {
        if (res.error.status === 429)
          setFailed(i18n._(tooManyAttempts(minutesUntilRetry(res.error))));
        else if (res.error.code === "PASSWORD_TOO_LONG")
          setPasswordError(t`That password is too long.`);
        else if (res.error.code === "INVALID_TOKEN")
          setFailed(t`That reset link no longer works. Ask for a new one.`);
        else setFailed(t`Couldn’t reach Lymi. Check your connection and try again.`);
        return;
      }
      // The reset signed every session out, so nothing cached here belongs to anyone now.
      clearPersistedLearnerState();
      queryClient.clear();
      setPassword("");
      setDone(true);
    } catch {
      setFailed(t`Couldn’t reach Lymi. Check your connection and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResetPasswordView
      email={email}
      password={password}
      onPasswordChange={(value) => {
        setPassword(value);
        setPasswordError(null);
      }}
      onSubmit={submit}
      submitting={submitting}
      passwordError={passwordError}
      error={failed}
      done={done}
      expired={expired}
      onSignIn={() => void navigate({ to: "/login" })}
      // Straight into the form that sends one, rather than the door it lives behind.
      onAskAgain={() =>
        void navigate({ to: "/login", search: { mode: "forgot", ...(email ? { email } : {}) } })
      }
    />
  );
}
