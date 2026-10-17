import { describe, expect, it } from "vitest";
import { personas } from "../../server/dev/personas";
import { hasLook } from "./persona-avatar";

describe("persona avatars", () => {
  it("draw a face for every persona, so none falls back to a letter", () => {
    expect(personas.filter((p) => !hasLook(p.id)).map((p) => p.id)).toEqual([]);
  });
});
