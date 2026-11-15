export const title = "Today's review day on the server";

const names = {
  open: "Today open",
  goal_met: "Goal met",
  exhausted: "Done: nothing left today",
  nothing_due: "Nothing due today",
};
export const state = (v) => {
  const reviews = v.attempts === 1 ? "1 review" : `${v.attempts} reviews`;
  return `${names[v.outcome] ?? v.outcome}, ${reviews}`;
};

export const group = (v) =>
  v.outcome === "open" ? "open" : v.outcome === "nothing_due" ? "empty" : "done";
export const colors = { open: "tan", done: "teal", empty: "blue" };

const who = (r) =>
  r.startsWith("g") ? `grade ${r.slice(1)}` : r === "u" ? "Undo" : "opening Lymi";
/** The request a step moved. */
const mover = (from, to) =>
  Object.keys(to.pc).find(
    (k) => from.pc[k] !== to.pc[k] || JSON.stringify(from.seen[k]) !== JSON.stringify(to.seen[k]),
  );
const by = (text) => (from, to) => `${who(mover(from, to) ?? "")} ${text(from, to)}`;

const steps = {
  VisitCountsDue: by(() => "counts the cards due"),
  Reads: by(() => "reads the day"),
  GradeLands: by(() => "is saved"),
  UndoLands: () => "Undo takes the earlier grade back",
  VisitCounts: by(() => "counts the reviews"),
  VisitConfirms: () => "opening Lymi marks the day nothing due",
  Counts: by(() => "counts the reviews"),
  Writes: by((_, to) => `marks the day ${names[to.outcome] ?? to.outcome}`),
  Rereads: by(() => "finds the day moved and reads it again"),
  Done: () => null,
};
export const step = (action, from, to) => (action in steps ? steps[action](from, to) : action);
