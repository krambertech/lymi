import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { messages } from "../../locales/en.po";
import { clipFor, exampleClip, useExampleAudio } from "./example-audio";

i18n.load("en", messages);
i18n.activate("en");

vi.mock("../lib/now-playing", () => ({ playAlone: () => Promise.resolve() }));
vi.mock("../lib/telemetry", () => ({ captureAnalytics: () => undefined }));

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const card = (updatedAt: Date) => ({
  id: "c1",
  example: "Sajab lund.",
  language: "et",
  exampleRecorded: true,
  updatedAt,
});

afterEach(() => vi.restoreAllMocks());

test("an example changed while its clip loads can still be played", async () => {
  const fetches = vi
    .spyOn(window, "fetch")
    // The first clip never arrives; the edited example's does.
    .mockReturnValueOnce(new Promise<Response>(() => {}))
    .mockResolvedValue(new Response(new Blob(["clip"], { type: "audio/mpeg" })));
  const { result, rerender } = await renderHook(
    (props?: { updatedAt: Date }) =>
      useExampleAudio(card(props?.updatedAt ?? new Date("2026-11-01")), "card"),
    { wrapper, initialProps: { updatedAt: new Date("2026-11-01") } },
  );

  result.current?.play();
  await expect.poll(() => result.current?.state).toBe("loading");

  await rerender({ updatedAt: new Date("2026-11-02") });
  await expect.poll(() => result.current?.state).toBe("idle");
  result.current?.play();
  await expect.poll(() => fetches.mock.calls.length).toBe(2);
  await expect.poll(() => result.current?.state).toBe("playing");
});

test("a clip's end from an earlier example leaves the current one's state alone", () => {
  const playing = exampleClip({ status: "idle" }, { type: "play", url: "b" });
  expect(exampleClip(playing, { type: "stop", url: "a" })).toBe(playing);
  expect(clipFor({ status: "loading", url: "a" }, "b")).toEqual({ status: "idle" });
});
