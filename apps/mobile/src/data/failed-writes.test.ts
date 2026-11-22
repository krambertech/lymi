import { ApiError, api } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { CardInput } from "@lymi/core";
import { MutationObserver, onlineManager } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { addInFront, kept } = vi.hoisted(() => ({
  addInFront: vi.fn(),
  kept: new Map<string, string>(),
}));
vi.mock("@lingui/core/macro", () => ({ t: (parts: TemplateStringsArray) => parts.join("") }));
vi.mock("expo-crypto", () => ({ getRandomValues: () => {} }));
vi.mock("expo-network", () => ({
  addNetworkStateListener: () => ({ remove: () => {} }),
  getNetworkStateAsync: async () => ({ isConnected: true }),
}));
vi.mock("react-native", () => ({ AppState: { addEventListener: () => ({ remove: () => {} }) } }));
vi.mock("../auth/client", () => ({ API_URL: "https://my.lymi.test", sessionHeaders: () => ({}) }));
vi.mock("./cache", () => ({ CACHE_MAX_AGE: 1000 }));
vi.mock("./kept", () => ({
  outboxStore: {
    getString: (key: string) => kept.get(key),
    set: (key: string, value: string) => kept.set(key, value),
    remove: (key: string) => kept.delete(key),
    getAllKeys: () => [...kept.keys()],
  },
}));
vi.mock("../ui/toast-host", () => ({ toast: { addInFront } }));

const { queryClient } = await import("./client");
const UNREACHABLE = "Couldn’t reach Lymi. Check your connection and try again.";
const said = { id: "failed-write", title: UNREACHABLE, error: true };
const unreachable = () => Promise.reject(new ApiError(0, UNREACHABLE));

beforeEach(() => {
  addInFront.mockClear();
  kept.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
});

const screen = (
  options: Partial<ConstructorParameters<typeof MutationObserver<unknown, Error, void>>[1]> = {},
) => {
  const observer = new MutationObserver<unknown, Error, void>(queryClient, {
    mutationFn: unreachable,
    ...options,
  });
  const leave = observer.subscribe(() => {});
  return { write: () => observer.mutate().catch(() => {}), leave, reset: observer.reset };
};

it("says a failed write on the phone's own client when nothing else does", async () => {
  vi.spyOn(api, "disconnectReadwise").mockImplementation(unreachable);
  await screen({ mutationFn: api.disconnectReadwise }).write();
  expect(addInFront).toHaveBeenCalledExactlyOnceWith(said);
});

it("leaves a write with its own onError, or one that says so, to say it once", async () => {
  await screen({ onError: () => {} }).write();
  await screen({ meta: { failure: "caller" } }).write();
  await screen({ meta: { failure: "silent", because: "nobody asked for it" } }).write();
  expect(addInFront).not.toHaveBeenCalled();
});

it("leaves an inline failure to the screen that shows it, rollback or not", async () => {
  await screen({ meta: { failure: "inline" } }).write();
  await screen({ meta: { failure: "inline" }, onError: () => {} }).write();
  expect(addInFront).not.toHaveBeenCalled();
});

it("says an inline failure when its screen has gone or its sheet was closed", async () => {
  for (const close of ["leave", "reset"] as const) {
    addInFront.mockClear();
    const sheet = screen({ meta: { failure: "inline" } });
    const write = sheet.write();
    sheet[close]();
    await write;
    expect(addInFront, close).toHaveBeenCalledExactlyOnceWith(said);
  }
});

it("leaves a choice a newer one replaced to the newer one", async () => {
  const goal = { meta: { failure: "inline" }, scope: { id: "goal" } } as const;
  const picker = screen(goal);
  const first = picker.write();
  const second = picker.write();
  await Promise.all([first, second]);
  expect(addInFront).not.toHaveBeenCalled();
});

it("says nothing for a write the outbox queued offline or Query is holding", async () => {
  onlineManager.setOnline(false);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network request failed"));
  const input = CardInput.parse({
    deckId: "01J00000000000000000000000",
    term: "tere",
    language: "et",
  });
  await screen({ networkMode: "always", mutationFn: () => writes.addCard(input) }).write();
  const held = vi.fn(unreachable);
  void screen({ mutationFn: held }).write();
  await vi.waitFor(() =>
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => mutation.state.isPaused),
    ).toBe(true),
  );
  expect(held).not.toHaveBeenCalled();
  expect(addInFront).not.toHaveBeenCalled();
});
