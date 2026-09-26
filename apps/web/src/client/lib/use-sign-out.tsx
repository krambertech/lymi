import { Plural, Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button } from "../components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { signOut as endSession } from "./auth";
import { outboxSize } from "./grades";
import { clearPersistedLearnerState } from "./persisted";
import { flushWrites, pendingWrites } from "./writes";

interface Ctx {
  signOut: () => Promise<void>;
  busy: boolean;
}
const SignOutCtx = createContext<Ctx | null>(null);

/**
 * Signing out, from wherever the learner menu is. Grades and changes made offline live only in
 * this browser until they reach the server, and sign-out clears the browser, so a queue that
 * cannot be sent stops the sign-out and asks; losing them is never the default.
 */
export function SignOutProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [unsent, setUnsent] = useState(0);
  const stayRef = useRef<HTMLButtonElement>(null);
  // The count stays on screen while the dialog closes.
  const last = useRef(unsent);
  if (unsent > 0) last.current = unsent;
  const queued = unsent || last.current;

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
      await flushWrites().catch(() => undefined);
    } finally {
      setBusy(false);
    }
    const left = outboxSize() + pendingWrites();
    if (left > 0) {
      setUnsent(left);
      return;
    }
    await leave();
  }, [busy, leave]);

  return (
    <SignOutCtx.Provider value={{ signOut, busy }}>
      {children}
      <Dialog open={unsent > 0} onOpenChange={(next) => !next && setUnsent(0)}>
        <DialogContent initialFocus={stayRef}>
          <DialogHeader>
            <DialogTitle>
              <Trans>Some offline work hasn’t synced</Trans>
            </DialogTitle>
            <DialogDescription>
              <Plural
                value={queued}
                one="# grade or change made offline is still waiting to reach Lymi. Sign out once you’re back online to keep it."
                other="# grades and changes made offline are still waiting to reach Lymi. Sign out once you’re back online to keep them."
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button ref={stayRef} onClick={() => setUnsent(0)}>
              <Trans>Stay signed in</Trans>
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => {
                setUnsent(0);
                void leave();
              }}
            >
              <Trans>Sign out and lose them</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SignOutCtx.Provider>
  );
}

export function useSignOut(): Ctx {
  const ctx = useContext(SignOutCtx);
  if (!ctx) throw new Error("useSignOut outside SignOutProvider");
  return ctx;
}
