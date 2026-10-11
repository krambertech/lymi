import { REVIEW_TIME_LIMIT_MS } from "@lymi/core";
import { focusManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Foreground, RecallClock } from "./recall-clock";

function setup(startVisible = true) {
  let now = 0;
  let visible = startVisible;
  const listeners = new Set<(visible: boolean) => void>();
  const foreground: Foreground = {
    visible: () => visible,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const clock = new RecallClock(foreground, () => now);
  const stop = clock.watch();
  return {
    clock,
    stop,
    wait: (ms: number) => void (now += ms),
    show: (next: boolean) => {
      visible = next;
      for (const listener of listeners) listener(next);
    },
  };
}

describe("the recall clock", () => {
  it("times the cue to the reveal and the reveal to the grade", () => {
    const { clock, wait } = setup();
    clock.start();
    wait(3200.4);
    clock.reveal();
    wait(900);
    expect(clock.stop()).toEqual({ recallMs: 3200, gradeMs: 900 });
  });

  it("leaves hidden time out, before and after the reveal", () => {
    const { clock, wait, show } = setup();
    clock.start();
    wait(1000);
    show(false);
    wait(60_000);
    show(true);
    wait(500);
    clock.reveal();
    show(false);
    wait(30_000);
    show(true);
    wait(200);
    expect(clock.stop()).toEqual({ recallMs: 1500, gradeMs: 200 });
  });

  it("waits for the foreground when the card arrives hidden", () => {
    const { clock, wait, show } = setup(false);
    clock.start();
    wait(5000);
    show(true);
    wait(700);
    clock.reveal();
    expect(clock.stop()).toEqual({ recallMs: 700, gradeMs: 0 });
  });

  it("counts a grade with no reveal before it as recall alone", () => {
    const { clock, wait } = setup();
    clock.start();
    wait(1200);
    expect(clock.stop()).toEqual({ recallMs: 1200 });
  });

  it("leaves out a time over the limit, keeping the other", () => {
    const { clock, wait } = setup();
    clock.start();
    wait(REVIEW_TIME_LIMIT_MS + 1);
    clock.reveal();
    wait(400);
    expect(clock.stop()).toEqual({ gradeMs: 400 });
  });

  it("starts afresh after a grade, and a second reveal moves nothing", () => {
    const { clock, wait } = setup();
    clock.start();
    wait(100);
    clock.reveal();
    wait(50);
    clock.reveal();
    wait(50);
    expect(clock.stop()).toEqual({ recallMs: 100, gradeMs: 100 });
    wait(300);
    expect(clock.stop()).toEqual({ recallMs: 300 });
  });

  it("stops hearing the foreground once unwatched", () => {
    const { clock, wait, show, stop } = setup();
    stop();
    clock.start();
    show(false);
    wait(400);
    expect(clock.stop()).toEqual({ recallMs: 400 });
  });

  it("pauses on what pauses Query by default: a hidden tab or a backgrounded app", () => {
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const clock = new RecallClock();
    const stop = clock.watch();
    clock.start();
    now += 300;
    focusManager.setFocused(false);
    now += 10_000;
    focusManager.setFocused(true);
    now += 200;
    expect(clock.stop()).toEqual({ recallMs: 500 });
    stop();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  focusManager.setFocused(undefined);
});
