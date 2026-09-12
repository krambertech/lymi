import { describe, expect, it } from "vitest";
import { escapeLike } from "./cards";

describe("escapeLike", () => {
  it("escapes the LIKE wildcards so a search for them is literal", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLike("sbrigarsi")).toBe("sbrigarsi");
    expect(escapeLike("più tardi")).toBe("più tardi");
  });
});
