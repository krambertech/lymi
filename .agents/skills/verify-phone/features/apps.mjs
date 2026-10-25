export const title = "Apps";

/** A persona reset keeps API keys and Readwise, so a run that stopped halfway is cleared first. */
export async function env({ api }) {
  for (const key of await api("/api/keys"))
    if (key.name === "Yomitan") await api(`/api/keys/${key.id}`, { method: "DELETE" });
  await api("/api/readwise", { method: "DELETE" }).catch(() => undefined);
  return { TOKEN: "lymi-dev-readwise-0000" };
}

/** The key and the Readwise connection the flow made are gone again. */
export async function check({ api, poll }) {
  return poll(async () => {
    const keys = await api("/api/keys");
    if (keys.some((k) => k.name === "Yomitan")) throw new Error("Yomitan's key is still listed");
    const readwise = await api("/api/readwise");
    if (readwise.connection) throw new Error("Readwise is still connected");
    return { keys: keys.length, readwise: null };
  });
}
