import { afterEach, expect, it, vi } from "vitest";
import { bodyFields, bodyJson, clonedJson, parseJson } from "./parse";

afterEach(() => {
  vi.restoreAllMocks();
});

it("treats text the parser gives up on as text that is not JSON", () => {
  expect(parseJson("{")).toBeUndefined();
  vi.spyOn(JSON, "parse").mockImplementation(() => {
    throw new RangeError("Maximum call stack size exceeded");
  });
  expect(parseJson("[[]]")).toBeUndefined();
});

it("treats a body that was already read as unreadable", async () => {
  for (const type of ["application/json", "application/x-www-form-urlencoded"]) {
    const request = new Request("https://my.lymi.app/", {
      method: "POST",
      headers: { "content-type": type },
      body: '{"email":"kai@lymi.test"}',
    });
    await request.text();
    expect(await bodyFields(request)).toBeNull();
    expect(await bodyJson(request)).toBeUndefined();
    expect(await clonedJson(request)).toBeUndefined();
  }
});
