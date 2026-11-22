import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { useClip } from "./use-clip";

let made: TestAudio[] = [];

class TestAudio extends EventTarget {
  paused = true;
  currentTime = 0;

  constructor(readonly src: string) {
    super();
    made.push(this);
  }

  async play() {
    this.paused = false;
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    setTimeout(() => this.dispatchEvent(new Event("pause")));
  }
}

beforeEach(() => {
  made = [];
  vi.stubGlobal("Audio", TestAudio);
});

afterEach(() => vi.unstubAllGlobals());

const playing = () => made.filter((audio) => !audio.paused).map((audio) => audio.src);
const eventsDelivered = () => new Promise((resolve) => setTimeout(resolve, 20));

test("leaving stops the clip, and a clip that loads after leaving never plays", async () => {
  const { result, unmount } = await renderHook(() => useClip());
  const late = result.current.load("late");
  await result.current.load("term").play();
  expect(playing()).toEqual(["term"]);

  await unmount();
  expect(playing()).toEqual([]);
  expect(await late.play()).toBe(false);
  expect(playing()).toEqual([]);
});

test("the term and its example never speak at once, and the one cut off is told it ended", async () => {
  const term = await renderHook(() => useClip());
  const example = await renderHook(() => useClip());
  const termEnded = vi.fn();
  await term.result.current.load("term", { onEnd: termEnded }).play();
  expect(await example.result.current.load("example").play()).toBe(true);
  expect(playing()).toEqual(["example"]);
  await expect.poll(() => termEnded.mock.calls.length).toBe(1);
});

test("a replay pressed while the clip speaks starts it again", async () => {
  const { result } = await renderHook(() => useClip());
  const onEnd = vi.fn();
  const clip = result.current.load("term", { onEnd });
  await clip.play();
  result.current.stop();
  expect(await clip.play()).toBe(true);
  await eventsDelivered();
  expect(playing()).toEqual(["term"]);
  expect(onEnd).not.toHaveBeenCalled();
});

test.each([
  { name: "another clip", next: "second" },
  { name: "the same clip", next: "first" },
])("a press for $name that cuts off one still starting is not a failure", async ({ next }) => {
  const { result } = await renderHook(() => useClip());
  const clips = { first: result.current.load("first"), second: result.current.load("second") };
  const [cutOff] = made;
  const starts: (() => void)[] = [];
  if (cutOff) {
    cutOff.play = () =>
      new Promise((_, reject) => {
        starts.push(() => reject(new DOMException("interrupted", "AbortError")));
        if (cutOff) cutOff.play = async () => undefined;
      });
  }
  const starting = clips.first.play();
  expect(await clips[next === "first" ? "first" : "second"].play()).toBe(true);
  for (const refuse of starts) refuse();
  expect(await starting).toBe(false);
});

test("a clip that cannot play says so to the press that asked", async () => {
  const { result } = await renderHook(() => useClip());
  const clip = result.current.load("missing");
  const [missing] = made;
  if (missing) missing.play = () => Promise.reject(new DOMException("no", "NotSupportedError"));
  await expect(clip.play()).rejects.toThrow("no");
});
