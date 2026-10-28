import { Trans } from "@lingui/react/macro";
import { isolate, MIN_PASSWORD_LENGTH } from "@lymi/core";
import type { FormEvent, ReactNode } from "react";
import { type AppIdentity, AppMark } from "../components/app-mark";
import { AppleMark } from "../components/apple-mark";
import { AuthFrame } from "../components/auth-frame";
import { AuthNotice } from "../components/auth-notice";
import { Button } from "../components/button";
import { GoogleMark } from "../components/google-mark";
import { PasswordField } from "../components/password-field";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../components/ui/field";
import { Input } from "../components/ui/input";
import { publicSiteUrl } from "../lib/origins";

/** What the panel is asking for. Google stays put; only the form below it changes. */
export type LoginMode = "sign-in" | "sign-up" | "forgot";

export interface CredentialValues {
  email: string;
  password: string;
}

export interface LoginErrors {
  /** A failure of the door itself, such as a Google callback that came back refused. */
  door?: ReactNode | undefined;
  /** A failure of the form below the rule. It sits with the fields, not with Google. */
  form?: ReactNode | undefined;
  /** The message under the email box, such as an address that is not an address. */
  email?: ReactNode | undefined;
  /** The message under the password box, such as one that is too short. */
  password?: ReactNode | undefined;
}

export interface LoginProps {
  mode?: LoginMode | undefined;
  onModeChange?: ((mode: LoginMode) => void) | undefined;
  onApple?: (() => void | Promise<void>) | undefined;
  onGoogle?: (() => void | Promise<void>) | undefined;
  /** Submits the form the current mode shows. */
  onSubmit?: ((values: CredentialValues) => void | Promise<void>) | undefined;
  email?: string | undefined;
  onEmailChange?: ((email: string) => void) | undefined;
  password?: string | undefined;
  onPasswordChange?: ((password: string) => void) | undefined;
  /** Which way in is working: the Google button or the form. */
  pending?: "apple" | "google" | "form" | undefined;
  /**
   * Set when an MCP client sent the learner here from its own sign-in. The door then says
   * who is waiting on the other side, so the consent screen is not the first mention of it.
   */
  app?: AppIdentity | undefined;
  errors?: LoginErrors | undefined;
  /** Replaces the whole form once a link is on its way. */
  notice?: { title: ReactNode; body: ReactNode; actions?: ReactNode } | undefined;
  children?: ReactNode | undefined;
}

/** The front door. Anyone may create an account; the panel only asks which form to show. */
export function LoginView({
  mode = "sign-in",
  onModeChange,
  onGoogle,
  onApple,
  onSubmit,
  email = "",
  onEmailChange,
  password = "",
  onPasswordChange,
  pending,
  app,
  errors = {},
  notice,
  children,
}: LoginProps) {
  const appName = app?.name;
  const { door: error, form: formError, email: emailError, password: passwordError } = errors;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit?.({ email, password });
  }

  return (
    <AuthFrame
      footer={
        <div className="w-full">
          <AccessNote />
          {children}
        </div>
      }
      homeHref={publicSiteUrl()}
    >
      {/* In the Mac app's sign-in window the window is the surface, so the form drops its plate. */}
      <section className="edge min-w-0 rounded-xl bg-plate p-6 @xl:p-10 mac:bg-transparent mac:p-1 mac:[box-shadow:none]">
        {app ? (
          <div className="flex flex-col items-center text-center">
            <AppMark app={app} className="size-12" />
            <h1 className="mt-4 text-2xl font-medium tracking-[-0.02em] text-ink">
              <Trans>Continue to {{ appName: isolate(appName) }}</Trans>
            </h1>
            <p className="mt-2 max-w-[36ch] text-md text-ink-secondary">
              <Trans>Sign in, then choose what it can do.</Trans>
            </p>
          </div>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink">
              {mode === "sign-up" ? (
                <Trans>Create your Lymi account</Trans>
              ) : mode === "forgot" ? (
                <Trans>Reset your password</Trans>
              ) : (
                <Trans>Sign in to Lymi</Trans>
              )}
            </h1>
            <p className="mx-auto mt-2 max-w-[38ch] text-md text-ink-secondary">
              {mode === "forgot" ? (
                <Trans>We’ll email you a link to set a new one.</Trans>
              ) : mode === "sign-up" ? (
                <Trans>Lymi is free to use.</Trans>
              ) : (
                <Trans>Welcome back.</Trans>
              )}
            </p>
          </div>
        )}

        {error && (
          <AuthNotice role="alert" tone="danger" className="mt-6">
            {error}
          </AuthNotice>
        )}

        {notice ? (
          <>
            <AuthNotice role="status" tone="success" title={notice.title} className="mt-7">
              {notice.body}
            </AuthNotice>
            {notice.actions && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">{notice.actions}</div>
            )}
          </>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  loading={pending === "apple"}
                  disabled={Boolean(pending && pending !== "apple")}
                  onClick={onApple}
                  className="mt-7 w-full edge-strong font-medium mac:mt-5"
                >
                  <AppleMark data-icon="inline-start" className="size-5" />
                  <Trans>Continue with Apple</Trans>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  loading={pending === "google"}
                  disabled={Boolean(pending && pending !== "google")}
                  onClick={onGoogle}
                  // A stronger edge than the usual secondary: this is the way in most learners
                  // take, and the one amber belongs to the form they are filling.
                  className="mt-3 w-full edge-strong font-medium"
                >
                  <GoogleMark data-icon="inline-start" className="size-5" />
                  <Trans>Continue with Google</Trans>
                </Button>
                <div
                  aria-hidden="true"
                  className="my-6 mac:my-4 flex items-center gap-3 text-sm text-ink-muted before:h-px before:flex-1 before:bg-edge before:content-[''] after:h-px after:flex-1 after:bg-edge after:content-['']"
                >
                  <Trans context="Between two ways to sign in">or</Trans>
                </div>
              </>
            )}

            <form onSubmit={submit} noValidate className={mode === "forgot" ? "mt-7" : undefined}>
              {formError && (
                <AuthNotice role="alert" tone="danger" className="mb-5">
                  {formError}
                </AuthNotice>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel>
                    <Trans>Email</Trans>
                  </FieldLabel>
                  <Input
                    type="email"
                    name="email"
                    autoComplete="username email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => onEmailChange?.(event.target.value)}
                  />
                  {emailError && <FieldError>{emailError}</FieldError>}
                </Field>

                {mode !== "forgot" && (
                  <Field>
                    <FieldLabel>
                      <Trans>Password</Trans>
                    </FieldLabel>
                    <PasswordField
                      value={password}
                      onValueChange={(value) => onPasswordChange?.(value)}
                      autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                      meter={mode === "sign-up"}
                      email={email}
                    />
                    {passwordError && <FieldError>{passwordError}</FieldError>}
                    {mode === "sign-up" && !passwordError && !password && (
                      <FieldDescription>
                        <Trans>At least {MIN_PASSWORD_LENGTH} characters.</Trans>
                      </FieldDescription>
                    )}
                    {mode === "sign-in" && (
                      <button
                        type="button"
                        onClick={() => onModeChange?.("forgot")}
                        className="-me-1 self-end rounded-sm px-1 py-1 text-sm text-ink-muted underline decoration-edge-strong underline-offset-4 transition-colors duration-150 hoverable:hover:text-ink-secondary hoverable:hover:decoration-current"
                      >
                        <Trans>Forgot your password?</Trans>
                      </button>
                    )}
                  </Field>
                )}
              </FieldGroup>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={pending === "form"}
                disabled={pending === "apple" || pending === "google"}
                className="mt-6 w-full mac:mt-5"
              >
                {mode === "sign-up" ? (
                  <Trans>Create account</Trans>
                ) : mode === "forgot" ? (
                  <Trans>Send reset link</Trans>
                ) : (
                  <Trans>Sign in</Trans>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-muted mac:mt-4">
              {mode === "sign-in" ? (
                <>
                  <Trans>New to Lymi?</Trans>{" "}
                  <SwitchLink onClick={() => onModeChange?.("sign-up")}>
                    <Trans>Create an account</Trans>
                  </SwitchLink>
                </>
              ) : (
                <SwitchLink onClick={() => onModeChange?.("sign-in")}>
                  <Trans>Back to sign in</Trans>
                </SwitchLink>
              )}
            </p>
          </>
        )}
      </section>
    </AuthFrame>
  );
}

/**
 * What the app is, which is a different question from which form is open. It sits under the
 * panel rather than inside it, so it reads as the terms of the door rather than a second
 * thing to press.
 */
/** Said on the web, where a newcomer may not know Lymi yet; the Mac app was installed on purpose. */
function AccessNote() {
  return (
    <p className="mt-6 text-center text-sm text-ink-muted mac:hidden">
      <Trans>Lymi is in public beta.</Trans>{" "}
      <a
        href={publicSiteUrl()}
        className="rounded-sm text-ink-secondary underline decoration-edge-strong underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-current"
      >
        <Trans>What is Lymi?</Trans>
      </a>
    </p>
  );
}

function SwitchLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm font-medium text-ink underline decoration-edge-strong underline-offset-4 transition-colors duration-150 hoverable:hover:decoration-current"
    >
      {children}
    </button>
  );
}
