import { expect, test, vi } from "vitest";
import { api } from "../src/client/lib/api";
import { bootDesign } from "./boot";

// The page parts need a document; the client is what this test is about.
vi.mock("../src/client/lib/i18n", () => ({ activate: () => {} }));
vi.mock("../src/client/lib/theme", () => ({ initTheme: () => {} }));

test("the standalone site configures the API client before Review's specimens resolve a clip", () => {
  bootDesign();
  expect(api.exampleAudioUrl("card-1")).toBe("/api/audio/card-1/example?v=1-0");
});
