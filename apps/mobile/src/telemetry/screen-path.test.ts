import { describe, expect, it } from "vitest";
import { screenPath } from "./screen-path";

describe("screenPath", () => {
  it("counts Apps and each app's page under Settings, as the web does", () => {
    expect(screenPath("/you/apps")).toBe("/settings");
    expect(screenPath("/you/apps/claude")).toBe("/settings/:item");
    expect(screenPath("/you/apps/readwise")).toBe("/settings/:item");
  });

  it("keeps the other screens under You as they were", () => {
    expect(screenPath("/you/api-keys")).toBe("/api-keys");
    expect(screenPath("/you/activity")).toBe("/activity");
    expect(screenPath("/library/archived")).toBe("/archived");
  });
});
