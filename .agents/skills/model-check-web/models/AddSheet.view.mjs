export const title = "Adding a card, closing and Undo";

export const state = (v) => {
  const sheet =
    v.phase === "closed"
      ? "Sheet closed"
      : v.phase === "saving"
        ? "Adding the card"
        : v.draft
          ? "Card typed"
          : "Empty form";
  const offer = v.undo ? (v.adds[v.undo] ? ", Undo offers a saved card" : ", Undo offered") : "";
  const late = v.phase !== "saving" && v.inFlight ? ", still adding" : "";
  return `${sheet}${late}${offer}`;
};

export const group = (v) =>
  v.undo && v.adds[v.undo] ? "bad" : v.phase === "closed" ? "closed" : "open";
export const colors = { closed: "tan", open: "blue", bad: "pink" };

const steps = {
  YouOpen: () => "you open Add a card",
  YouType: () => "you type a card",
  YouAdd: () => "you press Add",
  YouClose: () => "you close the sheet",
  SaveLands: (_from, to) =>
    to.phase === "editing" ? "the card is in [Create more]" : "the card is in",
  SaveFails: () => "it fails or is already in",
  YouUndo: () => "you press Undo",
};
export const step = (action, from, to) => (action in steps ? steps[action](from, to) : action);
