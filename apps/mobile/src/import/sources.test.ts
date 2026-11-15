import { beforeEach, describe, expect, it, vi } from "vitest";

const nativePick = vi.hoisted(() => vi.fn());

// expo-file-system 57's own wrapper: its options call turns every native rejection into a cancel.
vi.mock("expo-file-system", () => ({
  File: {
    pickFileAsync: async (first?: string | object, mimeType?: string) => {
      const older = mimeType !== undefined || typeof first === "string";
      try {
        const result = await nativePick();
        return older ? result : { canceled: false, result };
      } catch (error) {
        if (older) throw error;
        return { canceled: true, result: null };
      }
    },
  },
}));
vi.mock("expo-web-browser", () => ({ openBrowserAsync: vi.fn() }));
vi.mock("../auth/client", () => ({ siteUrl: (path: string) => path }));
vi.mock("../i18n", () => ({ i18n: { _: (m: { message?: string }) => m.message } }));

const { pickFile } = await import("./sources");

const failure = (code: string) => Object.assign(new Error(code), { code });

describe("pickFile", () => {
  beforeEach(() => {
    nativePick.mockReset();
  });

  it("says so when the picker fails, rather than looking like a cancel", async () => {
    nativePick.mockRejectedValue(failure("ERR_MISSING_VIEW_CONTROLLER"));
    const refused = vi.fn();
    await expect(pickFile(refused)).resolves.toBeNull();
    expect(refused).toHaveBeenCalledWith("Couldn’t open Files. Try again.");
  });

  it("says so when the picked file can't be read", async () => {
    const result = {
      name: "deck.apkg",
      get size(): number {
        throw new Error("provider failed");
      },
    };
    nativePick.mockResolvedValue(result);
    const refused = vi.fn();
    await expect(pickFile(refused)).resolves.toBeNull();
    expect(refused).toHaveBeenCalledWith(
      "Couldn’t open that file. Try again, or choose another one.",
    );
  });

  it.each([
    ["cancels on iOS", "ERR_FILE_PICKING_CANCELLED"],
    ["cancels on Android", "ERR_PICKER_CANCELLED"],
    ["taps twice while the picker is opening", "ERR_PICKING_IN_PROGRESS"],
  ])("stays quiet when the learner %s", async (_, code) => {
    nativePick.mockRejectedValue(failure(code));
    const refused = vi.fn();
    await expect(pickFile(refused)).resolves.toBeNull();
    expect(refused).not.toHaveBeenCalled();
  });

  it("hands back the picked file", async () => {
    const result = { name: "deck.apkg", size: 12 };
    nativePick.mockResolvedValue(result);
    await expect(pickFile(vi.fn())).resolves.toEqual({ file: result, name: "deck.apkg", size: 12 });
  });
});
