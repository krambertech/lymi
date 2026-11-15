export const title = "Offline cards across a sign-out";

const who = (v) => (v.session === "none" ? "Signed out" : `${v.session} signed in`);
const waiting = (v) => {
  const queue = v.cached ? v.cache : v.stored;
  return queue.length === 0 ? "nothing waiting" : `${queue[0][1]}'s card waiting`;
};
const crossed = (v) => v.sent.some((r) => r.author !== r.as);

export const state = (v) => {
  if (crossed(v)) return "A's card saved to B's account";
  const saved = v.sent.length > 0 ? ", card saved" : "";
  const air = v.air.on
    ? `, sending on ${v.air.as === "none" ? "no" : `${v.air.as}'s`} session`
    : v.flushing
      ? ", about to send"
      : "";
  return `${who(v)}, ${waiting(v)}${air}${saved}`;
};

export const group = (v) =>
  crossed(v) ? "bad" : v.session === "none" ? "out" : v.session === "A" ? "a" : "b";
export const colors = { out: "tan", a: "blue", b: "purple", bad: "pink" };

const steps = {
  SignIn: (from, to) => `${to.session} signs in`,
  SyncClaims: () => null,
  Submit: () => "you add a card offline",
  FlushStarts: () => "Lymi starts sending",
  FlushStopsOnClaim: () => "Lymi stops: the learner left",
  SendLeavesAny: () => "the request leaves",
  SendLands: () => "the server saves it",
  SendStops: () => "the request fails: offline or signed out",
  SendFails: () => "the server fails",
  FlushEnds: () => null,
  SessionEnds: () => "the session ends",
  Drops: () => "sign-out clears the phone",
};
export const step = (action, from, to) => (action in steps ? steps[action](from, to) : action);
