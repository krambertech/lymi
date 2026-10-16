import { decksQuery, settingsQuery } from "@lymi/client/queries";
import { useQuery } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { holdsArrival } from "../auth/held-link";

// Whether Welcome is the screen, decided once at the root rather than by Today, so a new account goes
// from sign-in straight into Welcome and Today first appears once Welcome is done.
// docs/design/onboarding.md "On the phone".

let deck: string | null = null;
let after: Href | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A deck the learner just joined or added before getting set up: Welcome opens with it. */
export function welcomeWith(deckId: string | null) {
  deck = deckId;
  for (const listener of listeners) listener();
}

export const useWelcomeDeck = () => useSyncExternalStore(subscribe, () => deck);

/** Where the learner goes once Welcome is done, such as their first review. */
export function setAfterWelcome(href: Href | null) {
  after = href;
}

/** Taken once by Today, the first screen after Welcome. */
export function takeAfterWelcome(): Href | null {
  const href = after;
  after = null;
  return href;
}

/**
 * True while Welcome is the signed-in screen, false once it is not, and undefined while the
 * account is still being read. An account with nothing in it and no `onboarded_at` starts there,
 * unless a held link to a deck is about to open; that link's deck brings Welcome back with it.
 * A read that fails or waits offline goes to Today.
 */
export function useWelcoming(learnerId: string | undefined): boolean | undefined {
  const signedIn = !!learnerId;
  const settings = useQuery({ ...settingsQuery, enabled: signedIn });
  const decks = useQuery({ ...decksQuery, enabled: signedIn });
  const arrivedWith = useWelcomeDeck();
  // Decided once per sign-in, so emptying Library later never sends the learner back to Welcome.
  const decided = useRef<{ learner: string; welcome: boolean } | null>(null);
  const unread = (q: typeof settings | typeof decks) =>
    !q.data && (q.isError || q.fetchStatus === "paused");
  const failed = unread(settings) || unread(decks);
  // A copy kept from before can say "not set up" after the web already did it, so that answer waits
  // for this launch's read; "set up" needs no second look.
  const cachedOnly = settings.data?.onboardedAt === null && !settings.isFetchedAfterMount;
  const known = !!settings.data && !!decks.data && !cachedOnly;
  useEffect(() => {
    // A sign-out forgets it, so the next sign-in, even by the same learner, is decided afresh.
    if (!learnerId) decided.current = null;
    if (!learnerId || decided.current?.learner === learnerId || !known) return;
    decided.current = {
      learner: learnerId,
      welcome: settings.data?.onboardedAt === null && decks.data?.length === 0 && !holdsArrival(),
    };
  }, [learnerId, known, settings.data, decks.data]);
  if (!signedIn || failed) return false;
  if (settings.data?.onboardedAt) return false;
  if (arrivedWith) return true;
  if (!known) return undefined;
  const same = decided.current?.learner === learnerId ? decided.current.welcome : undefined;
  return (
    same ?? (settings.data?.onboardedAt === null && decks.data?.length === 0 && !holdsArrival())
  );
}
