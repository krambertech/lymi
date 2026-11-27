import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { playInTurn, stopSound, toggleInTurn, toggleSound } from "./player";

class FakeAudio {
  static last: FakeAudio | null = null;
  src = "";
  currentTime = 0;
  playbackRate = 1;
  defaultPlaybackRate = 1;
  preservesPitch = true;
  ended = false;
  error = null;
  paused = true;
  started: string[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplay: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  onpause: (() => void) | null = null;
  constructor() {
    FakeAudio.last = this;
  }
  play() {
    this.paused = false;
    this.started.push(this.src);
    queueMicrotask(() => this.onplaying?.());
    return Promise.resolve();
  }
  pause() {
    if (this.paused) return;
    this.paused = true;
    this.onpause?.();
  }
}

const audio = () => FakeAudio.last as FakeAudio;
const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(() => {
  Object.assign(globalThis, {
    Audio: FakeAudio,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  });
});

afterEach(() => stopSound());

describe("a play control", () => {
  it("stops its sound when pressed while it plays", async () => {
    const first = toggleSound("/a.mp3");
    await settle();
    expect(audio().paused).toBe(false);
    await expect(toggleSound("/a.mp3")).resolves.toBe("cut");
    await expect(first).resolves.toBe("cut");
    expect(audio().paused).toBe(true);
  });

  it("plays another clip rather than stopping when a different one plays", async () => {
    void toggleSound("/a.mp3");
    await settle();
    void toggleSound("/b.mp3");
    await settle();
    expect(audio().src).toBe("/b.mp3");
    expect(audio().paused).toBe(false);
  });
});

describe("a sequence", () => {
  const lines = [
    { src: "/one.mp3", key: "one" },
    { src: "/two.mp3", key: "two" },
  ];

  it("ends when its clip is stopped, rather than going on to the next", async () => {
    const run = playInTurn(lines);
    await settle();
    stopSound();
    await expect(run).resolves.toEqual({ finished: false, at: 0 });
    await settle(400);
    expect(audio().started.at(-1)).toBe("/one.mp3");
  });

  it("pauses on a second press and says where it stopped", async () => {
    const run = toggleInTurn(lines, "whole");
    await settle();
    audio().onended?.();
    await settle(400);
    expect(audio().src).toBe("/two.mp3");
    expect(toggleInTurn(lines, "whole")).toBeNull();
    await expect(run).resolves.toEqual({ finished: false, at: 1 });
    expect(audio().paused).toBe(true);
  });

  it("finishes when every clip has played", async () => {
    const run = toggleInTurn(lines, "whole");
    await settle();
    audio().onended?.();
    await settle(400);
    audio().onended?.();
    await expect(run).resolves.toEqual({ finished: true, at: 2 });
  });
});
