import { describe, expect, it } from "vitest";
import { groupAt, type MeasuredItem, nearestItem } from "./fluid-hover";

const row = (y: number, group = 0, disabled = false): MeasuredItem => ({
  rect: { x: 0, y, width: 100, height: 40 },
  group,
  disabled,
});

describe("nearestItem", () => {
  it("picks the row under the pointer", () => {
    const rows = [row(0), row(44), row(88)];
    expect(nearestItem(rows, { x: 10, y: 50 }, "y", 0)).toBe(1);
  });

  it("picks the nearer row in a gap", () => {
    const rows = [row(0), row(48)];
    expect(nearestItem(rows, { x: 10, y: 41 }, "y", 0)).toBe(0);
    expect(nearestItem(rows, { x: 10, y: 47 }, "y", 0)).toBe(1);
  });

  it("skips disabled rows", () => {
    const rows = [row(0), row(44, 0, true), row(88)];
    expect(nearestItem(rows, { x: 10, y: 60 }, "y", 0)).toBe(0);
  });

  it("never crosses a divider", () => {
    const rows = [row(0), row(60, 1)];
    expect(nearestItem(rows, { x: 10, y: 58 }, "y", 1)).toBe(1);
    expect(nearestItem(rows, { x: 10, y: 58 }, "y", 0)).toBe(0);
  });

  it("returns null when the group has nothing enabled", () => {
    expect(nearestItem([row(0, 0, true)], { x: 10, y: 10 }, "y", 0)).toBeNull();
  });

  it("measures along x for a strip and both ways for a grid", () => {
    const cells: MeasuredItem[] = [
      { rect: { x: 0, y: 0, width: 40, height: 40 }, group: 0, disabled: false },
      { rect: { x: 50, y: 0, width: 40, height: 40 }, group: 0, disabled: false },
      { rect: { x: 0, y: 50, width: 40, height: 40 }, group: 0, disabled: false },
    ];
    expect(nearestItem(cells, { x: 46, y: 200 }, "x", 0)).toBe(1);
    expect(nearestItem(cells, { x: 42, y: 42 }, "xy", 0)).toBe(0);
    expect(nearestItem(cells, { x: 44, y: 46 }, "xy", 0)).toBe(2);
  });
});

describe("groupAt", () => {
  it("counts the dividers the pointer has passed", () => {
    expect(groupAt([50, 120], { x: 0, y: 10 }, "y")).toBe(0);
    expect(groupAt([50, 120], { x: 0, y: 60 }, "y")).toBe(1);
    expect(groupAt([50, 120], { x: 0, y: 200 }, "y")).toBe(2);
    expect(groupAt([50], { x: 60, y: 0 }, "x")).toBe(1);
    expect(groupAt([50], { x: 60, y: 60 }, "xy")).toBe(0);
  });
});
