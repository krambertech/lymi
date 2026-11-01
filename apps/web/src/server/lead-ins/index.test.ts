import { describe, expect, it, vi } from "vitest";
import type { Bindings } from "../env";
import { leadInDependencies } from ".";

describe("lead-in dependencies", () => {
  it("logs a missing gateway once and leaves the decision to the writer", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const env = { AI: {}, PRODUCT_URL: "https://my.lymi.app" } as unknown as Bindings;

    expect(leadInDependencies(env).decide).toBeUndefined();
    expect(leadInDependencies(env).decide).toBeUndefined();

    expect(logged).toHaveBeenCalledTimes(1);
    expect(logged).toHaveBeenCalledWith(
      JSON.stringify({ event: "lead_in_decisions_off", error: "AiGatewayError" }),
    );
    logged.mockRestore();
  });
});
