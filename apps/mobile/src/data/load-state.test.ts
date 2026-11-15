import { describe, expect, it } from "vitest";
import { couldNotLoad } from "./load-state";

const read = (over: Partial<Parameters<typeof couldNotLoad>[0][number]> = {}) => ({
  data: undefined,
  isError: false,
  fetchStatus: "fetching" as const,
  ...over,
});

describe("couldNotLoad", () => {
  it("counts a read waiting offline with nothing kept, which never errors", () => {
    expect(couldNotLoad([read({ fetchStatus: "paused" })], false)).toBe(true);
  });

  it("counts a failed read online", () => {
    expect(couldNotLoad([read({ isError: true, fetchStatus: "idle" })], true)).toBe(true);
  });

  it("leaves a read still loading to its skeleton", () => {
    expect(couldNotLoad([read()], true)).toBe(false);
  });

  it("shows what was kept, whatever happens to the refresh", () => {
    expect(couldNotLoad([read({ data: {}, fetchStatus: "paused" })], false)).toBe(false);
    expect(couldNotLoad([read({ data: {}, isError: true })], true)).toBe(false);
  });

  it("fails a screen when any one of its reads could not run", () => {
    expect(couldNotLoad([read({ data: {} }), read({ fetchStatus: "paused" })], false)).toBe(true);
  });
});
