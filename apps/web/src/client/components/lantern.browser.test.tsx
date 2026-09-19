import { MotionConfig } from "motion/react";
import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { Lantern } from "./lantern";

const sparks = (root: Element) => root.querySelectorAll(".lantern-sparks path").length;

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

test("no spark plays under reduced motion", async () => {
  const view = await render(
    <MotionConfig reducedMotion="always">
      <Lantern progress={0.2} fed={0} />
    </MotionConfig>,
  );
  await view.rerender(
    <MotionConfig reducedMotion="always">
      <Lantern progress={0.22} fed={1} />
    </MotionConfig>,
  );
  expect(sparks(view.container)).toBe(0);
});
