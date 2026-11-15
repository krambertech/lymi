export const title = "Hints in review";

const TERM = "sundima";
const HINT =
  "A deadline on a sunny day FORCES you indoors: sundima, made to sit at your desk all afternoon.";

/**
 * A deck of its own whose one card has a long hint, so its place under the cue is plain, and Tricky
 * Estonian's often-forgotten cards, which offer a hint, with AI allowed so Draft can run. Every meaning is marked as the AI's, which
 * review once badged.
 */
export async function env({ api }) {
  const send = (method, path, body) =>
    api(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const post = (path, body) => send("POST", path, body);
  // A reset leaves the learner's AI choice unanswered, and Draft waits for a yes.
  await send("PUT", "/api/settings/ai-consent", {
    allowed: true,
    version: 1,
    updated_at: Date.now(),
  });
  const deck = await post("/api/decks", { name: "Hint glide", defaultLanguage: "et" });
  const { card } = await post("/api/cards", {
    deckId: deck.id,
    term: TERM,
    meaning: "to force, to compel",
    enrich: false,
    hint: HINT,
  });
  const offer = await post("/api/dev/often-forgotten", { hinted: false });
  for (const id of [card.id, ...offer.cardIds])
    await post(`/api/dev/cards/${id}/enriched`, { fields: ["meaning"] });
  return { GLIDE_DECK: deck.id, OFFER_DECK: offer.deckId };
}

/** Saving the untouched draft keeps it as the AI's, which proves Draft reached the Worker. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Tricky Estonian");
  return poll(async () => {
    const rows = await api(`/api/decks/${deck.id}/cards`);
    const hinted = rows.find((r) => r.card.hint);
    if (!hinted) throw new Error("No card in Tricky Estonian has a hint yet");
    if (hinted.card.hintSource !== "ai")
      throw new Error(`The saved draft's source is ${hinted.card.hintSource}`);
    return { term: hinted.card.term, hint: hinted.card.hint, source: hinted.card.hintSource };
  });
}
