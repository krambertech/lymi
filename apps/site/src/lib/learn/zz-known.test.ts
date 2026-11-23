import { it } from "vitest";
import { CLIPS, clipSentences, clipText } from "./clips";
it("prints", () => {
  const order = (process.env.SLUGS ?? "").split(" ").filter(Boolean);
  const seen = new Set<string>();
  for (const slug of order) for (const clip of Object.values(CLIPS[slug] ?? {})) {
    const text = typeof clip === "string" ? clip : "turns" in clip || "sentences" in clip ? clipSentences(clip as never).join(" ") : clipText(clip);
    for (const w of text.toLowerCase().split(/[^a-zõäöüšž]+/).filter(Boolean)) seen.add(w);
  }
  const ask = (process.env.ASK ?? "").toLowerCase().split(/[^a-zõäöüšž]+/).filter(Boolean);
  console.log("UNKNOWN:", [...new Set(ask.filter((w) => !seen.has(w)))].join(" "));
});
