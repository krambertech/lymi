import { describe, expect, it } from "vitest";
import { claim, release } from "./door-pending";

describe("the door's one pending action", () => {
  it("refuses a resend while a code is being confirmed, and a second resend", () => {
    expect(claim("form", "resend")).toBeNull();
    expect(claim("resend", "resend")).toBeNull();
    expect(claim(null, "resend")).toBe("resend");
  });

  it("frees the door only for the action that held it", () => {
    expect(release("form", "resend")).toBe("form");
    expect(release("form", "form")).toBeNull();
  });
});
