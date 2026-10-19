import { Buffer } from "node:buffer";
import { startAsTestLearner } from "./auth";
import { expect, test } from "./test";

function silentClip() {
  const pcm = Buffer.alloc(1600);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

test("editing a Japanese meaning fetches fresh audio while an unchanged replay reuses the player", async ({
  page,
  browserName,
}, testInfo) => {
  if (browserName === "webkit") {
    // Exercise cache identity independently of WebKit's media decoder, keeping requests real.
    await page.addInitScript(() => {
      class CachedAudio extends EventTarget {
        currentTime = 0;
        private loaded: Promise<ArrayBuffer> | null = null;
        private timer: ReturnType<typeof setTimeout> | undefined;
        constructor(readonly src: string) {
          super();
        }
        async play() {
          if (!this.loaded)
            this.loaded = fetch(this.src).then((response) => response.arrayBuffer());
          await this.loaded;
          this.timer = setTimeout(() => this.dispatchEvent(new Event("ended")), 100);
        }
        pause() {
          clearTimeout(this.timer);
        }
      }
      Object.defineProperty(window, "Audio", { value: CachedAudio });
    });
  }
  await startAsTestLearner(page, testInfo, "core-learning");
  const deck = await page.request.post("/api/decks", {
    data: { name: "Japanese audio", defaultLanguage: "ja" },
  });
  expect(deck.ok()).toBeTruthy();
  const { id: deckId } = await deck.json();
  const added = await page.request.post("/api/cards", {
    data: {
      deckId,
      term: "橋",
      pronunciation: "はし",
      meaning: "bridge",
      language: "ja",
      enrich: false,
    },
  });
  expect(added.ok()).toBeTruthy();
  const urls: string[] = [];
  await page.route("**/api/audio/**", async (route) => {
    urls.push(route.request().url());
    await route.fulfill({
      contentType: "audio/wav",
      body: silentClip(),
      headers: { "Cache-Control": "private, no-store" },
    });
  });
  await page.goto(`/review?deck=${deckId}`);
  await page
    .getByRole("button", { name: "Reveal the card", exact: true })
    .click({ position: { x: 24, y: 24 } });
  const play = page.getByRole("button", { name: "Play pronunciation", exact: true });
  await play.click();
  await expect.poll(() => urls.length).toBe(1);
  await expect(play).toBeVisible();
  await play.click();
  await expect(play).toBeVisible();
  expect(urls).toHaveLength(1);

  await page.getByRole("button", { name: "Card options", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Edit card", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit card", exact: true });
  await editor.getByRole("textbox", { name: "Meaning", exact: true }).fill("bridge over a river");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByText("bridge over a river", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await play.click();
  await expect.poll(() => urls.length).toBe(2);
  expect(urls[1]).not.toBe(urls[0]);
  expect(urls.every((url) => /[?]v=1-\d+$/.test(url))).toBeTruthy();
  expect(urls.every((url) => !url.includes("bridge"))).toBeTruthy();
});
