import { validateCimdMetadata } from "@better-auth/cimd";
import {
  CURSOR_CLIENT_PATH,
  cursorClientMetadata,
  GEMINI_CLI_CLIENT_PATH,
  GROK_CLIENT_PATH,
  geminiCliClientMetadata,
  grokClientMetadata,
} from "@lymi/core";
import { describe, expect, it } from "vitest";

describe.each([
  { name: "Gemini CLI", path: GEMINI_CLI_CLIENT_PATH, metadata: geminiCliClientMetadata },
  { name: "Cursor", path: CURSOR_CLIENT_PATH, metadata: cursorClientMetadata },
  { name: "Grok", path: GROK_CLIENT_PATH, metadata: grokClientMetadata },
])("$name client document", ({ path, metadata }) => {
  it("passes the metadata profile Lymi enforces", () => {
    const clientId = new URL(path, "https://lymi.app").toString();
    const result = validateCimdMetadata(clientId, metadata("https://lymi.app"), {
      metadataProfile: "mcp-2026-07-28",
    });

    expect(result).toMatchObject({ valid: true });
    expect(result).not.toHaveProperty("warnings");
  });
});
