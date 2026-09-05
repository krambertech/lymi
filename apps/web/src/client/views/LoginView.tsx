import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { Wordmark } from "../components/Logo";

export interface LoginProps {
  onGoogle?: (() => void | Promise<void>) | undefined;
  busy?: boolean | undefined;
  /** Shown in place of the fine print when sign-in fails. */
  error?: string | undefined;
  children?: ReactNode | undefined;
}

/**
 * The front door. Two blocks: who this is, and the one thing to do. The lantern is lit but not
 * glowing — a glow means something is due, and on this screen nothing is.
 */
export function LoginView({ onGoogle, busy, error, children }: LoginProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-14 text-center pt-safe pb-safe">
      <Lantern className="size-28 @3xl:size-32" flicker />
      {/* Plain wordmark: the lantern above it already carries the flame. */}
      <h1 className="mt-6">
        <Wordmark size={30} className="block text-text" title="Lymi" />
      </h1>
      <p className="mt-2.5 max-w-[28ch] text-md text-muted">Vocabulary you carry with you.</p>

      {/* The button sets the width of everything under it, so the smallest text is never the widest. */}
      <div className="mt-11 grid w-full max-w-60 gap-4">
        <Button variant="primary" size="lg" loading={busy} onClick={onGoogle}>
          Continue with Google
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : (
          <p className="text-sm text-muted">Invite only for now.</p>
        )}
      </div>
      {children}
    </div>
  );
}
