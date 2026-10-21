import { describe, expect, it } from "vitest";
import { isolate, unisolate } from "../isolate";
import { textDirection } from "./direction";

describe("textDirection", () => {
  it("runs right to left for a language whose default script does", () => {
    for (const tag of ["ar", "ar-EG", "he", "fa-IR", "ur", "ps", "yi", "ckb", "arz", "ary", "dv"]) {
      expect(textDirection(tag)).toBe("rtl");
    }
  });

  it("lets a script subtag decide", () => {
    expect(textDirection("az-Arab")).toBe("rtl");
    expect(textDirection("pa_Arab_PK")).toBe("rtl");
    expect(textDirection("sd-Deva")).toBe("auto");
    expect(textDirection("ks-Deva-IN")).toBe("auto");
    expect(textDirection("ug-Cyrl")).toBe("auto");
  });

  it("leaves every other tag, and none, to the text", () => {
    for (const tag of ["ja", "zh-Hant", "ru", "en", "az", "", null, undefined]) {
      expect(textDirection(tag)).toBe("auto");
    }
  });
});

describe("isolate", () => {
  it("wraps text in a first-strong isolate once", () => {
    expect(isolate("كتاب")).toBe("⁨كتاب⁩");
    expect(isolate(isolate("كتاب"))).toBe("⁨كتاب⁩");
    expect(isolate("")).toBe("");
  });

  it("comes off again for an accessible name", () => {
    expect(unisolate(`Options for ${isolate("كتب")}`)).toBe("Options for كتب");
    expect(unisolate(undefined)).toBeUndefined();
  });
});
