import { describe, expect, it } from "vitest";
import { enrichmentModel } from ".";
import { TERRA } from "./terra";

describe("enrichmentModel", () => {
  it.each(["zh", "zh-CN", "zh-TW", "ru", "uk"])("gives %s Terra", (tag) => {
    expect(enrichmentModel(tag)).toBe(TERRA);
  });

  it.each(["yue", "zh-yue", "ja", "ta", "pl", "no", null, undefined])(
    "leaves %s on the provider's default",
    (tag) => {
      expect(enrichmentModel(tag)).toBeUndefined();
    },
  );
});
