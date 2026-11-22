import { cropOf } from "./geometry.mjs";

export async function captureCrops(page, notes, viewport, save) {
  const cdp = await page.context().newCDPSession(page);
  for (const [i, note] of notes.entries()) {
    const clip = { ...cropOf(note.box, viewport), scale: 3 };
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", clip });
    save(note, i, Buffer.from(data, "base64"));
  }
  await cdp.detach();
}
