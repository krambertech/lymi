import { signIn } from "../scripts/doctor.mjs";
import { readRecord } from "../scripts/stack.mjs";

export const title = "Delete account";

const MEMBER = "streak";

/** Shares the learner's first deck with another persona, so the page has a deck that stays. */
export async function env({ api }) {
  const { worker } = readRecord();
  const deck = (await api("/api/decks")).find((d) => d.role === "owner");
  if (!deck) throw new Error("The persona owns no deck");
  const { link } = await api(`/api/decks/${deck.id}/join-link`, { method: "POST" });
  const token = link.url.split("/join/")[1];
  const cookie = await signIn(worker, MEMBER, { reset: true });
  const joined = await fetch(`${worker}/api/join/${token}`, {
    method: "POST",
    headers: { cookie },
  });
  if (!joined.ok) throw new Error(`${MEMBER} could not join: HTTP ${joined.status}`);
  const summary = await api("/api/me/deletion");
  const me = await api("/api/me");
  return {
    WORKER: worker,
    EMAIL: me.email,
    DECK_ID: deck.id,
    SHARED: deck.name,
    DECKS: summary.decks,
    CARDS: summary.cards,
    REVIEWS: summary.reviews,
  };
}

/**
 * The learner is gone: their session no longer answers, and the shared deck stays for its member
 * under the former owner.
 */
export async function check({ api, poll }) {
  const { worker } = readRecord();
  return poll(async () => {
    const gone = await api("/api/me").then(
      () => false,
      () => true,
    );
    if (!gone) throw new Error("The learner's session still answers /api/me");
    const cookie = await signIn(worker, MEMBER);
    const decks = await (await fetch(`${worker}/api/decks`, { headers: { cookie } })).json();
    const kept = decks.find((d) => d.owner?.former);
    if (!kept) throw new Error(`${MEMBER} has no deck under a former owner`);
    return { learnerSignedOut: true, kept: { id: kept.id, name: kept.name, owner: kept.owner } };
  });
}
