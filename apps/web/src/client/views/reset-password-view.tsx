import { Trans } from "@lingui/react/macro";
import type { FormEvent, ReactNode } from "react";
import { AuthFrame } from "../components/auth-frame";
import { AuthNotice } from "../components/auth-notice";
import { Button } from "../components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { publicSiteUrl } from "../lib/origins";

export interface ResetPasswordProps {
  password?: string | undefined;
  onPasswordChange?: ((password: string) => void) | undefined;
  onSubmit?: (() => void | Promise<void>) | undefined;
  submitting?: boolean | undefined;
  /** The message under the box, such as a password that is too short. */
  passwordError?: ReactNode | undefined;
  /** A failure the form cannot fix, such as a link that has been used. */
  error?: ReactNode | undefined;
  /** Set once the password is saved. The form gives way to the way back in. */
  done?: boolean | undefined;
  /** No usable token on the URL, so there is nothing to set. */
  expired?: boolean | undefined;
  onSignIn?: (() => void) | undefined;
  onAskAgain?: (() => void) | undefined;
}

/** The second half of a reset: the link has been opened, and a new password is typed here. */
export function ResetPasswordView({
  password = "",
  onPasswordChange,
  onSubmit,
  submitting,
  passwordError,
  error,
  done = false,
  expired = false,
  onSignIn,
  onAskAgain,
}: ResetPasswordProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit?.();
  }

  return (
    <AuthFrame homeHref={publicSiteUrl()}>
      <section className="edge min-w-0 rounded-xl bg-plate p-6 @xl:p-10">
        <div className="text-center">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-text">
            {done ? <Trans>Your password is set</Trans> : <Trans>Set a new password</Trans>}
          </h1>
          {/* The form's instruction is wrong once there is no form, so each state says its own. */}
          <p className="mx-auto mt-2 max-w-[38ch] text-md text-text-2">
            {done ? (
              <Trans>Every other device signed in with the old one has been signed out.</Trans>
            ) : expired ? (
              <Trans>A reset link works for one hour, and only once.</Trans>
            ) : (
              <Trans>Choose one you haven’t used on Lymi before.</Trans>
            )}
          </p>
        </div>

        {expired && !done && (
          <AuthNotice role="status" tone="neutral" className="mt-6">
            <Trans>That reset link no longer works. Ask for a new one.</Trans>
          </AuthNotice>
        )}

        {error && !done && (
          <AuthNotice role="alert" tone="danger" className="mt-6">
            {error}
          </AuthNotice>
        )}

        {done ? (
          <Button variant="primary" size="lg" onClick={onSignIn} className="mt-7 w-full">
            <Trans>Sign in</Trans>
          </Button>
        ) : expired ? (
          <Button variant="primary" size="lg" onClick={onAskAgain} className="mt-7 w-full">
            <Trans>Send a new link</Trans>
          </Button>
        ) : (
          <form onSubmit={submit} noValidate className="mt-7">
            <Field>
              <FieldLabel>
                <Trans>New password</Trans>
              </FieldLabel>
              <Input
                type="password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => onPasswordChange?.(event.target.value)}
              />
              {passwordError ? (
                <FieldError>{passwordError}</FieldError>
              ) : (
                <FieldDescription>
                  <Trans>At least 8 characters.</Trans>
                </FieldDescription>
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="mt-6 w-full"
            >
              <Trans>Save password</Trans>
            </Button>
          </form>
        )}
      </section>
    </AuthFrame>
  );
}
