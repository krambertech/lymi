import { Plural, Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button } from "../components/Button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "../components/ResponsiveDialog";
import { flushOutbox, outboxSize } from "./api";
import { signOut as endSession } from "./auth";
import { clearPersistedLearnerState } from "./persisted";

interface Ctx {
  signOut: () => Promise<void>;
  busy: boolean;
}
const SignOutCtx = createContext<Ctx | null>(null);

/**
 * Signing out, from wherever the learner menu is. Grades made offline live only in this
 * browser until they reach the server, and sign-out clears the browser, so a queue that
 * cannot be sent stops the sign-out and asks; losing them is never the default.
 */
export function SignOutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);
  const stayRef = useRef<HTMLButtonElement>(null);

  const leave = useCallback(async () => {
    setBusy(true);
    try {
      await endSession();
    } finally {
      setBusy(false);
    }
    // Whoever signs in next must not inherit this learner's cache or queued grades.
    queryClient.clear();
    clearPersistedLearnerState();
    navigate({ to: "/login" });
  }, [navigate, queryClient]);

  const signOut = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await flushOutbox().catch(() => 0);
    } finally {
      setBusy(false);
    }
    const left = outboxSize();
    if (left > 0) {
      setQueued(left);
      return;
    }
    await leave();
  }, [busy, leave]);

  return (
    <SignOutCtx.Provider value={{ signOut, busy }}>
      {children}
      <ResponsiveDialog open={queued > 0} onOpenChange={(next) => !next && setQueued(0)}>
        <ResponsiveDialogContent initialFocus={stayRef}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              <Trans>Some grades haven’t synced</Trans>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              <Plural
                value={queued}
                one="# grade from an offline review is still waiting to reach Lymi. Sign out once you’re back online to keep it."
                other="# grades from offline reviews are still waiting to reach Lymi. Sign out once you’re back online to keep them."
              />
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button ref={stayRef} onClick={() => setQueued(0)}>
              <Trans>Stay signed in</Trans>
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => {
                setQueued(0);
                void leave();
              }}
            >
              <Trans>Sign out and lose them</Trans>
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </SignOutCtx.Provider>
  );
}

export function useSignOut(): Ctx {
  const ctx = useContext(SignOutCtx);
  if (!ctx) throw new Error("useSignOut outside SignOutProvider");
  return ctx;
}
