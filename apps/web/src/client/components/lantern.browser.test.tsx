import type { StreakOut } from "@lymi/core";
import { MotionConfig } from "motion/react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { FLAME_SIZE, lanternFor, streakFlameFor } from "../lib/flame";
import { Flame } from "./flame";
import { Lantern } from "./lantern";

const summary = (
  current: number,
  attempts: number,
  outcome: StreakOut["today"]["outcome"] = "open",
): StreakOut => ({
  today: { date: "2026-09-19", attempts, goal: 50, outcome },
  goal: 50,
  current,
  longest: current,
  reviewedDays: current,
  days: [],
});

const NO_STREAK = summary(0, 0);
const FIRST_REVIEW = summary(0, 1);
const GOAL = summary(1, 50, "goal_met");
const STREAK_MORNING = summary(4, 0);

const flame = (root: Element) => root.querySelector<SVGGElement>(".flame-size");
const flameOpacity = (root: Element) => Number(getComputedStyle(flame(root) as Element).opacity);
/** The flame's height against the brand flame, read from the transform Motion writes. */
const flameHeight = (root: Element) =>
  new DOMMatrix(getComputedStyle(flame(root) as Element).transform).d;
const sparks = (root: Element) => root.querySelectorAll(".lantern-sparks path").length;

describe.each(["light", "dark"] as const)("the %s room", (theme) => {
  test("the lantern is out with no streak, small after the first review and full at the goal", async () => {
    const view = await render(
      <div data-theme={theme}>
        <Lantern {...lanternFor(NO_STREAK)} fed={0} />
      </div>,
    );
    const root = view.container;
    expect(flameOpacity(root)).toBe(0);

    await view.rerender(
      <div data-theme={theme}>
        <Lantern {...lanternFor(FIRST_REVIEW)} fed={1} />
      </div>,
    );
    await expect.poll(() => flameOpacity(root), { timeout: 3000 }).toBe(1);
    await expect.poll(() => flameHeight(root), { timeout: 3000 }).toBeCloseTo(FLAME_SIZE.start, 1);

    await view.rerender(
      <div data-theme={theme}>
        <Lantern {...lanternFor(GOAL)} fed={50} />
      </div>,
    );
    await expect.poll(() => flameHeight(root), { timeout: 4000 }).toBeCloseTo(FLAME_SIZE.full, 2);
  });

  test("a streak's lantern is lit before the day's first review", async () => {
    const view = await render(
      <div data-theme={theme}>
        <Lantern {...lanternFor(STREAK_MORNING)} />
      </div>,
    );
    expect(flameOpacity(view.container)).toBe(1);
    expect(flameHeight(view.container)).toBeCloseTo(FLAME_SIZE.start, 2);
  });

  test("the streak flame is out, lit after the first review and full at the goal", async () => {
    const view = await render(
      <div data-theme={theme}>
        {[NO_STREAK, FIRST_REVIEW, STREAK_MORNING, GOAL].map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of fixtures.
          <Flame key={i} state={streakFlameFor(s)} />
        ))}
      </div>,
    );
    const states = [...view.container.querySelectorAll("[data-flame]")].map((f) =>
      f.getAttribute("data-flame"),
    );
    expect(states).toEqual(["out", "lit", "lit", "full"]);
  });
});

test("every grade throws a spark that clears itself", async () => {
  const view = await render(<Lantern progress={0.2} fed={0} />);
  const root = view.container;
  expect(sparks(root)).toBe(0);

  await view.rerender(<Lantern progress={0.22} fed={1} />);
  expect(sparks(root)).toBeGreaterThanOrEqual(2);

  // A quick run of grades keeps at most three sets in the air.
  for (let fed = 2; fed <= 6; fed++) await view.rerender(<Lantern progress={0.3} fed={fed} />);
  expect(sparks(root)).toBeLessThanOrEqual(9);

  await expect.poll(() => sparks(root), { timeout: 3000 }).toBe(0);
});

test("the first review of a day with no streak lights the flame and sparks at once", async () => {
  const view = await render(<Lantern {...lanternFor(NO_STREAK)} fed={0} />);
  await view.rerender(<Lantern {...lanternFor(FIRST_REVIEW)} fed={1} />);
  expect(sparks(view.container)).toBeGreaterThanOrEqual(2);
});

test("under reduced motion the flame takes its size at once and no spark plays", async () => {
  const view = await render(
    <MotionConfig reducedMotion="always">
      <Lantern {...lanternFor(NO_STREAK)} fed={0} />
    </MotionConfig>,
  );
  await view.rerender(
    <MotionConfig reducedMotion="always">
      <Lantern {...lanternFor(FIRST_REVIEW)} fed={1} />
    </MotionConfig>,
  );
  expect(sparks(view.container)).toBe(0);
  await expect.poll(() => flameOpacity(view.container)).toBe(1);
  expect(flameHeight(view.container)).toBeGreaterThan(FLAME_SIZE.start);
  expect(flameHeight(view.container)).toBeLessThan(1);
});
