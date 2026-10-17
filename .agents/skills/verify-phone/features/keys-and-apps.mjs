export const title = "API keys and connected apps";

export async function env() {
  return { KEY: "Maestro key" };
}

/** The key the flow made is gone again, so the learner's keys are as they were. */
export async function check({ api, poll }) {
  return poll(async () => {
    const keys = await api("/api/keys");
    if (keys.some((k) => k.name === "Maestro key"))
      throw new Error("The Maestro key is still listed");
    return { keys: keys.length };
  });
}
