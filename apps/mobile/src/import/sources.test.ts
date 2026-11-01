import { beforeEach, describe, expect, it, vi } from "vitest";

const pickFileAsync = vi.hoisted(() => vi.fn());

vi.mock("expo-file-system", () => ({ File: { pickFileAsync } }));
vi.mock("expo-web-browser", () => ({ openBrowserAsync: vi.fn() }));
vi.mock("../auth/client", () => ({ siteUrl: (path: string) => path }));
vi.mock("../i18n", () => ({ i18n: { _: (m: { message?: string }) => m.message } }));

const { pickFile } = await import("./sources");

describe("pickFile", () => {
  beforeEach(() => {
    pickFileAsync.mockReset();
  });

  it("says so when the picked file can't be read, rather than looking like a cancel", async () => {
    const result = {
      name: "deck.apkg",
      get size(): number {
        throw new Error("provider failed");
      },
    };
    pickFileAsync.mockResolvedValue({ canceled: false, result });
    const refused = vi.fn();
    await expect(pickFile(refused)).resolves.toBeNull();
    expect(refused).toHaveBeenCalledOnce();
  });

  it("stays quiet when the learner cancels", async () => {
    pickFileAsync.mockResolvedValue({ canceled: true });
    const refused = vi.fn();
    await expect(pickFile(refused)).resolves.toBeNull();
    expect(refused).not.toHaveBeenCalled();
  });

  it("hands back the picked file", async () => {
    const result = { name: "deck.apkg", size: 12 };
    pickFileAsync.mockResolvedValue({ canceled: false, result });
    await expect(pickFile(vi.fn())).resolves.toEqual({ file: result, name: "deck.apkg", size: 12 });
  });
});
