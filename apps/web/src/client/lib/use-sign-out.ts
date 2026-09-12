import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { flushOutbox } from "./api";
import { signOut } from "./auth";
import { clearPersistedLearnerState } from "./persisted";

/** Signing out, from wherever the learner menu is. */
export function useSignOut(): { signOut: () => Promise<void>; busy: boolean } {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    signOut: async () => {
      if (busy) return;
      setBusy(true);
      try {
        // Grades made offline would leave with the session; send them first if the network is back.
        await flushOutbox().catch(() => 0);
        await signOut();
      } finally {
        setBusy(false);
      }
      // Whoever signs in next must not inherit this learner's cache or queued grades.
      queryClient.clear();
      clearPersistedLearnerState();
      navigate({ to: "/login" });
    },
  };
}
