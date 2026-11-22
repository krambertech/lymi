import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { aiChoice, saveAiChoice } from "./ai-consent";
import { api, type Settings } from "./api";
import { settingsQuery } from "./queries";

describe("the learner's answer about AI", () => {
  it("is unanswered, never a no, before the settings load or from a cache older than it", () => {
    expect(aiChoice(undefined)).toBeNull();
    expect(aiChoice({})).toBeNull();
    expect(aiChoice({ aiConsent: false })).toBe(false);
    expect(aiChoice({ aiConsent: true })).toBe(true);
  });

  it("is in every screen's settings once saved", async () => {
    const qc = new QueryClient();
    const saved = { aiConsent: false } as Settings;
    vi.spyOn(api, "updateAiConsent").mockResolvedValue(saved);
    await saveAiChoice(qc, false, "settings");
    expect(qc.getQueryData(settingsQuery.queryKey)).toBe(saved);
  });
});
