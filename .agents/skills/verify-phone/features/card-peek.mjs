export const title = "Card peek";

const DECK = "Lezione 12";
const MEANING =
  "to deal with something quickly and get it out of the way before you turn to anything else";
const EXAMPLE = "Devo sbrigare due cose prima di uscire, poi ti raggiungo al bar in centro.";
const TRANSLATION = "I have two things to deal with before I leave.";
const json = { "content-type": "application/json" };
/** What the flow was given, for the check that follows it in the same run. */
let given;

/** Gives one card in Lezione 12 a meaning long enough for three lines, an example and its translation. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === DECK);
  const { card } = (await api(`/api/decks/${deck.id}/cards`))[0];
  await api(`/api/cards/${card.id}`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ meaning: MEANING, example: EXAMPLE, exampleTranslation: TRANSLATION }),
  });
  given = { deckId: deck.id, id: card.id };
  return { DECK_ID: deck.id, TERM: card.term };
}

/** The peek changes nothing, so the card keeps what the setup gave it. */
export async function check({ api, poll }) {
  return poll(async () => {
    const rows = await api(`/api/decks/${given.deckId}/cards`);
    const card = rows.find((r) => r.card.id === given.id)?.card;
    if (card?.meaning !== MEANING) throw new Error("The card's meaning changed");
    return { term: card.term, meaning: card.meaning, example: card.example };
  });
}
