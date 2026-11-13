import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { api, type Draw } from "./api";
import { drawQuery } from "./queries";
import { useDayTurn } from "./streak";

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);
const backToFront = () => document.dispatchEvent(new Event("visibilitychange"));

beforeEach(() => {
  qc = new QueryClient();
  const end = new Date(Date.now() - 60_000).toISOString();
  qc.setQueryData(drawQuery({}).queryKey, { day: { end } } as Draw & { fetchedAt: number });
  vi.spyOn(api, "checkToday").mockResolvedValue({} as Awaited<ReturnType<typeof api.checkToday>>);
  vi.spyOn(api, "draw").mockImplementation(() => new Promise(() => {}));
});
afterEach(() => {
  vi.restoreAllMocks();
});

test("a page that is no visit leaves a kept day unsettled", async () => {
  await renderHook(() => useDayTurn(false), { wrapper });
  backToFront();
  expect(api.checkToday).not.toHaveBeenCalled();
});

test("coming back to the app after the day ended settles the new one", async () => {
  await renderHook(() => useDayTurn(true), { wrapper });
  backToFront();
  expect(api.checkToday).toHaveBeenCalledOnce();
});
