import { describe, expect, it } from "vitest";
import { centralDirectory, ZipSegment } from "../exports/zip";
import { anki } from "./anki";
import { bytesSource, type RandomAccess } from "./files";
import { lymi } from "./lymi";
import { mochi } from "./mochi";
import { noji } from "./noji";
import { pleco } from "./pleco";
import { quizlet } from "./quizlet";

const outage = new Error("R2 unavailable");

const unreachable: RandomAccess = {
  size: 1000,
  read: () => Promise.reject(outage),
  stream: () => Promise.reject(outage),
};

async function losingItsEntries(names: string[]): Promise<RandomAccess> {
  const segment = new ZipSegment(0);
  for (const name of names) await segment.add(name, new TextEncoder().encode("{}"), true);
  const directory = centralDirectory(segment.records, segment.length);
  const file = bytesSource(new Uint8Array(Buffer.concat([segment.bytes(), directory])));
  return { ...file, stream: () => Promise.reject(outage) };
}

describe("storage that fails while a file is read", () => {
  it.each([anki, lymi, mochi, noji])("is not a file $source cannot read", async (adapter) => {
    await expect(adapter.detect(unreachable, "cards.zip")).rejects.toBe(outage);
  });

  it.each([pleco, quizlet])("is not text $source cannot decode", async (adapter) => {
    await expect(adapter.inspect(unreachable)).rejects.toBe(outage);
  });

  it("is not a damaged export", async () => {
    const lymiFile = await losingItsEntries(["lymi.json", "cards.jsonl"]);
    await expect(lymi.inspect(lymiFile)).rejects.toBe(outage);
    await expect(mochi.inspect(await losingItsEntries(["data.json"]))).rejects.toBe(outage);
  });
});
