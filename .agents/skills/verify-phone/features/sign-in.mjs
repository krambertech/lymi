export const title = "Sign in with Apple";

export async function check({ before, api }) {
  const after = await api("/api/dev/state");
  if (JSON.stringify(after.counts) !== JSON.stringify(before.counts))
    throw new Error("The signed-out screen changed the learner's cards");
  return { counts: after.counts, appleAuthentication: "requires a physical iPhone" };
}
