import { validateCimdMetadata } from "@better-auth/cimd";
import { GEMINI_CLI_CLIENT_PATH, geminiCliClientMetadata } from "@lymi/core";
import { describe, expect, it } from "vitest";

describe("Gemini CLI client document", () => {
  it("passes the metadata profile Lymi enforces", () => {
    const clientId = new URL(GEMINI_CLI_CLIENT_PATH, "https://lymi.app").toString();
    const result = validateCimdMetadata(clientId, geminiCliClientMetadata("https://lymi.app"), {
      metadataProfile: "mcp-2026-07-28",
    });

    expect(result).toMatchObject({ valid: true });
    expect(result).not.toHaveProperty("warnings");
  });
});
