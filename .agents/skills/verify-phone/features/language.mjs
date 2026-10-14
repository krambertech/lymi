export const title = "Language";

let saved;

export async function env({ api }) {
  const settings = await api("/api/settings");
  if (settings.appLanguage !== "en") {
    throw new Error(`The persona starts in ${settings.appLanguage}, not English`);
  }
  saved = settings.updatedAt;
  return {};
}

/** Both choices reached the account: it was saved since the flow began and ends in English again. */
export async function check({ api, poll }) {
  return poll(async () => {
    const { appLanguage, meaningLanguage, updatedAt } = await api("/api/settings");
    if (updatedAt === saved) throw new Error("The settings were never saved");
    if (appLanguage !== "en" || meaningLanguage !== "en") {
      throw new Error(`Stored ${JSON.stringify({ appLanguage, meaningLanguage })}`);
    }
    return { appLanguage, meaningLanguage, updatedAt };
  });
}
