export const title = "Learning emails";

export async function env({ api }) {
  const { learningEmails } = await api("/api/settings");
  if (learningEmails === false) throw new Error("The persona starts with learning emails off");
  return {};
}

/** The switch reached the account. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { learningEmails } = await api("/api/settings");
    if (learningEmails !== false) throw new Error(`Stored ${learningEmails}`);
    return { learningEmails };
  });
}
