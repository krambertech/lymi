export const title = "An import's writes after it ended";

const names = {
  ready: "Ready to import",
  importing: "Importing",
  done: "Imported",
  failed: "Import failed",
  cancelled: "Import cancelled",
};

export const state = (v) => {
  const n = v.cards.length;
  const cards = n === 0 ? "no cards yet" : n === 1 ? "1 chunk of cards" : `${n} chunks of cards`;
  const shelf = v.archived
    ? v.active.length > 0
      ? ", archived but cards still showing"
      : ", archived"
    : "";
  return `${names[v.status]}, ${cards}${shelf}`;
};

export const group = (v) =>
  v.archived && v.active.length > 0
    ? "bad"
    : v.status === "importing"
      ? "busy"
      : v.status === "ready"
        ? "wait"
        : "ended";
export const colors = { wait: "tan", busy: "blue", ended: "teal", bad: "pink" };

const steps = {
  Confirm: () => "you confirm the import",
  RunReads: () => "the run reads the import",
  ChunkLands: (from, to) =>
    to.cards.length > from.cards.length ? "a chunk of cards is written" : "a chunk is refused",
  Finish: (from, to) => (to.status !== from.status ? "the import finishes" : "the run stops"),
  FailReads: () => "the stall check finds the import slow",
  FailWrites: (from, to) =>
    to.status !== from.status
      ? "the stall check fails the import"
      : "the stall check finds it already over",
  CancelReads: () => "you open cancel",
  CancelWrites: (from, to) =>
    to.status !== from.status ? "you cancel" : "cancel finds it started",
  ArchiveReads: () => "you open archive",
  ArchiveWrites: () => "you archive the import",
  Done: () => null,
};
export const step = (action, from, to) => (action in steps ? steps[action](from, to) : action);
