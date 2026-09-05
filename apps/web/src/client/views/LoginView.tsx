import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { Wordmark } from "../components/Logo";

export interface LoginProps {
  onGoogle?: (() => void | Promise<void>) | undefined;
  busy?: boolean | undefined;
  children?: ReactNode | undefined;
}

/** The front door. The lantern is already lit: you are expected. */
export function LoginView({ onGoogle, busy, children }: LoginProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-6 text-center pt-safe pb-safe">
      <Lantern className="size-28 @3xl:size-32" flicker glow />
      <Wordmark size={30} flame className="mt-5 text-text" title="Lymi" />
      <p className="max-w-[28ch] text-md text-muted">Vocabulary you carry with you.</p>
      <Button
        variant="primary"
        size="lg"
        className="mt-6 min-w-60"
        loading={busy}
        onClick={onGoogle}
      >
        Continue with Google
      </Button>
      <p className="mt-2 text-sm text-muted">Private for now. Only invited accounts can sign in.</p>
      {children}
    </div>
  );
}
