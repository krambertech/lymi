export const title = "Yomitan";
export const start = "/settings";
export const persona = "japanese";

const deckName = "日本語 N5–N4";
const glossary =
  '<div class="yomitan-glossary"><ol><li data-dictionary="JMdict"><i>(n, vs, JMdict)</i> <span><ul data-sc-content="glossary"><li>walk</li><li>stroll</li></ul></span></li></ol></div>';

export default async function drive({ page, step, api, expect }) {
  let address = "";
  let key = "";

  await step("Open Yomitan from Settings", async () => {
    await page.getByRole("link", { name: /^Yomitan/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Yomitan" })).toBeVisible();
    address = await page.getByLabel("AnkiConnect server address").innerText();
    expect(address).toMatch(/\/api\/anki-connect$/);
    return { address };
  });

  await step("Make a key for Yomitan", async () => {
    // A reseed keeps API keys, so a key made by an earlier run turns the button into Replace the key.
    await page.getByRole("button", { name: /^(Make a key for Yomitan|Replace the key)$/ }).click();
    const output = page.getByLabel("API key for Yomitan");
    await expect(output).toBeVisible();
    key = await output.innerText();
    expect(key).toMatch(/^lymi_/);
    return { key: `${key.slice(0, 9)}…` };
  });

  const call = (action, params = {}) =>
    page.evaluate(
      async ([url, body]) =>
        (
          await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          })
        ).json(),
      [address, JSON.stringify({ action, params, version: 2, key })],
    );
  const note = (fields) => ({
    deckName,
    modelName: "Lymi card",
    fields,
    tags: ["yomitan"],
    options: { allowDuplicate: false, duplicateScope: "collection" },
  });

  await step("Connect as Yomitan's settings page does", async () => {
    expect(await call("version")).toBe(6);
    expect(await call("deckNames")).toContain(deckName);
    expect(await call("modelFieldNames", { modelName: "Lymi card" })).toEqual([
      "Term",
      "Reading",
      "Meaning",
      "Sentence",
      "URL",
      "Audio",
      "Sentence audio",
      "Picture",
    ]);
  });

  await step("Add 散歩 as Yomitan's popup does", async () => {
    expect(await call("canAddNotesWithErrorDetail", { notes: [note({ Term: "散歩" })] })).toEqual([
      { canAdd: true, error: null },
    ]);
    const id = await call("addNote", {
      note: note({
        Term: "散歩",
        Reading: "さんぽ",
        Meaning: glossary,
        Sentence: "毎朝、公園を<b>散歩</b>します。",
        URL: '<a href="https://www3.nhk.or.jp/news/easy/">NEWS WEB EASY</a>',
        Audio: "",
      }),
    });
    expect(typeof id).toBe("number");
    const { cards } = await api(`/api/cards?term=${encodeURIComponent("散歩")}`);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      deckName,
      pronunciation: "さんぽ",
      meaning: "walk; stroll",
      example: "毎朝、公園を散歩します。",
      source: "https://www3.nhk.or.jp/news/easy/",
      createdBy: "api",
    });
    return { card: cards[0] };
  });

  await step("See it as a duplicate, and refuse a word in another language", async () => {
    expect(await call("canAddNotesWithErrorDetail", { notes: [note({ Term: "散歩" })] })).toEqual([
      { canAdd: false, error: "cannot create note because it is a duplicate" },
    ]);
    const refused = await call("addNote", { note: note({ Term: "trattoria" }) });
    expect(refused.error).toContain("isn’t Japanese");
    const { cards } = await api("/api/cards?term=trattoria");
    expect(cards).toHaveLength(0);
    return { refused };
  });

  await step(
    "Activity lists the add under Yomitan, and Settings says the key is used",
    async () => {
      const { entries } = await api("/api/activity");
      expect(entries[0]).toMatchObject({ kind: "cards_added", app: "Yomitan" });
      await page.reload();
      await expect(page.getByText("Connected", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Added 1 card to 日本語/ })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Everything Yomitan did, in Activity" }),
      ).toBeVisible();
      await page.goBack();
      await expect(page.getByRole("link", { name: /^Yomitan/ })).toContainText("used");
      return { activity: entries[0] };
    },
  );

  await step("Read how to add clips and pictures with asbplayer", async () => {
    await page.getByRole("link", { name: /^Yomitan/ }).click();
    const section = page.getByRole("region", { name: "Audio and pictures from videos" });
    const heading = page.getByRole("heading", { name: "Audio and pictures from videos" });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
    for (const name of [
      "Sentence audio",
      "Picture",
      "Re-encode audio as mp3",
      "Update last card",
    ]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
    return { region: await section.count() };
  });

  // asbplayer speaks version 6, so its replies come in an envelope.
  const asbplayer = (action, params = {}) =>
    page.evaluate(
      async ([url, body]) =>
        (
          await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          })
        ).json(),
      [address, JSON.stringify({ action, params, version: 6, key })],
    );

  await step(
    "Update the last card as asbplayer does, with the line, its clip and a frame",
    async () => {
      const frame = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 36;
        const context = canvas.getContext("2d");
        context.fillStyle = "#2a6fd6";
        context.fillRect(0, 0, 64, 36);
        return canvas.toDataURL("image/png").split(",")[1];
      });
      const clip = btoa(String.fromCharCode(0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0, 1, 2, 3));
      const found = await asbplayer("findNotes", { query: "added:1" });
      const last = Math.max(...found.result);
      const info = await asbplayer("notesInfo", { notes: [last] });
      expect(info.result[0].fields.Term.value).toBe("散歩");
      expect(
        await asbplayer("storeMediaFile", { filename: "asbplayer_walk.mp3", data: clip }),
      ).toEqual({
        result: "asbplayer_walk.mp3",
        error: null,
      });
      await asbplayer("storeMediaFile", { filename: "asbplayer_walk.png", data: frame });
      expect(
        await asbplayer("updateNoteFields", {
          note: {
            id: last,
            fields: {
              Sentence: "週末は川沿いを散歩します。",
              "Sentence audio": "[sound:asbplayer_walk.mp3]",
              Picture: '<img src="asbplayer_walk.png">',
            },
          },
        }),
      ).toEqual({ result: null, error: null });
      expect(await asbplayer("addTags", { notes: [last], tags: "asbplayer" })).toEqual({
        result: null,
        error: null,
      });
      const { cards } = await api(`/api/cards?term=${encodeURIComponent("散歩")}`);
      expect(cards[0]).toMatchObject({
        example: "週末は川沿いを散歩します。",
        exampleRecorded: true,
        tags: ["asbplayer"],
      });
      expect(cards[0].image).not.toBeNull();
      await page.goto(`/library/${cards[0].deckId}`);
      await expect(page.getByText("散歩").first()).toBeVisible();
      return { card: cards[0] };
    },
  );
}
