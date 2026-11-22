import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { LookAlikes } from "../components/landing/LookAlikes";
import { StressPairs } from "../components/landing/StressPairs";
import { VoiceTiles } from "../components/landing/VoiceTiles";

i18n.load("en", {});
i18n.activate("en");

let made: TestAudio[] = [];

class TestAudio extends EventTarget {
  paused = true;
  duration = 10;
  timeReads = 0;

  constructor(readonly src: string) {
    super();
    made.push(this);
  }

  get currentTime() {
    this.timeReads += 1;
    return 1;
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
  vi.spyOn(window, "fetch").mockRejectedValue(new Error("no clip to draw"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const meaning = (message: string) => ({ id: message, message });
const inEnglish = (children: ReactNode) => <I18nProvider i18n={i18n}>{children}</I18nProvider>;

const voices = (
  <VoiceTiles
    lang="ja"
    folder="japanese"
    words={[
      { id: "neko", term: "猫", meaning: meaning("cat") },
      { id: "inu", term: "犬", meaning: meaning("dog") },
    ]}
  />
);

const lookAlikes = (
  <LookAlikes
    reader="en"
    words={[
      { id: "dywan", term: "dywan", looksLike: "divan", inPolish: "kanapa", meaning: "carpet" },
    ]}
  />
);

const stressPairs = (
  <StressPairs
    lang="ru"
    pairs={[
      {
        word: "замок",
        forms: [
          { marked: "за́мок", meaning: meaning("castle"), audio: "/castle.mp3" },
          { marked: "замо́к", meaning: meaning("lock"), audio: "/lock.mp3" },
        ],
      },
    ]}
  />
);

const frames = (count: number) =>
  new Promise<void>((resolve) => {
    const next = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1));
    next(count);
  });

const playing = () => made.filter((clip) => !clip.paused).map((clip) => clip.src);

test.each([
  { name: "VoiceTiles", part: voices, button: "Play 猫" },
  { name: "LookAlikes", part: lookAlikes, button: "Hear dywan" },
  { name: "StressPairs", part: stressPairs, button: "Hear за́мок, castle" },
])("leaving $name stops its clip and its frame loop", async ({ part, button }) => {
  const screen = await render(inEnglish(part));
  await screen.getByRole("button", { name: button, exact: true }).click();
  await expect.poll(playing).toHaveLength(1);

  await screen.unmount();
  expect(playing()).toEqual([]);
  const reads = made[0]?.timeReads;
  await frames(5);
  expect(made[0]?.timeReads).toBe(reads);
});

test("a second clip stops the first", async () => {
  const screen = await render(inEnglish(voices));
  await screen.getByRole("button", { name: "Play 猫", exact: true }).click();
  await screen.getByRole("button", { name: "Play 犬", exact: true }).click();
  await expect.poll(playing).toEqual(["/audio/japanese/inu.mp3"]);
});

test("a clip paused from outside the page ends its frame loop", async () => {
  const screen = await render(inEnglish(voices));
  await screen.getByRole("button", { name: "Play 猫", exact: true }).click();
  await expect.poll(() => made[0]?.timeReads).toBeGreaterThan(1);

  made[0]?.pause();
  await frames(2);
  const reads = made[0]?.timeReads;
  await frames(5);
  expect(made[0]?.timeReads).toBe(reads);
});
