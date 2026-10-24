export const title = "Report a shared deck or card";

/** Noor's Lisboa a dois, which the learner studies, and its first card. */
export async function env({ api }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lisboa a dois");
  if (!deck || deck.role === "owner") throw new Error("The persona studies no Lisboa a dois");
  const [row] = await api(`/api/decks/${deck.id}/cards`);
  return { DECK_ID: deck.id, CARD_ID: row.card.id, TERM: row.card.term };
}

/** The card's report reached Lymi's inbox, naming its reason and its term. */
export async function check({ api, poll }) {
  const deck = (await api("/api/decks")).find((d) => d.name === "Lisboa a dois");
  const [row] = await api(`/api/decks/${deck.id}/cards`);
  return poll(async () => {
    const { message } = await api("/api/dev/outbox", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: "hello@lymi.app" }),
    });
    const wanted = `Lymi report: Hateful or offensive · ${row.card.term}`;
    if (message?.subject !== wanted) throw new Error(`Latest report email: ${message?.subject}`);
    return { subject: message.subject };
  });
}
