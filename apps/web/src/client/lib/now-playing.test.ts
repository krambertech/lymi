import { describe, expect, it, vi } from "vitest";
import { playAlone } from "./now-playing";

const clip = () =>
  ({ play: vi.fn(async () => undefined), pause: vi.fn() }) as unknown as HTMLAudioElement;

describe("playAlone", () => {
  it("pauses the clip already playing, so the term and its example never speak at once", async () => {
    const term = clip();
    const example = clip();
    await playAlone(term);
    await playAlone(example);
    expect(term.pause).toHaveBeenCalledTimes(1);
    expect(example.pause).not.toHaveBeenCalled();
    await playAlone(example);
    expect(example.pause).not.toHaveBeenCalled();
  });
});
