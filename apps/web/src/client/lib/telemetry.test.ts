import { expect, it, vi } from "vitest";

const reportBrowserException = vi.hoisted(() => vi.fn());
vi.mock("@lymi/client/analytics", async (actual) => ({
  ...(await actual<typeof import("@lymi/client/analytics")>()),
  reportBrowserException,
}));
vi.mock("./stale-build", () => ({
  isStaleChunkError: () => false,
  reloadOntoCurrentBuild: () => false,
}));

const { reportClientException } = await import("./telemetry");

it("reports a route error once though the router and React both catch it", () => {
  const error = new TypeError("Load failed");
  reportClientException(error, "router");
  reportClientException(error, "react");
  reportClientException(new TypeError("Load failed"), "react");
  expect(reportBrowserException.mock.calls).toEqual([
    [error, "router"],
    [expect.any(TypeError), "react"],
  ]);
});
