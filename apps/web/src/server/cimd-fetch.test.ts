import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchClientMetadataResource } from "./cimd-fetch";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CIMD metadata fetch", () => {
  it("normalizes the redirect mode before Workers constructs the request", async () => {
    const NativeRequest = Request;
    class WorkerRequest extends NativeRequest {
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        if (init?.redirect === "error") {
          throw new TypeError('Invalid redirect value: "error"');
        }
        super(input, init);
      }
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("Request", WorkerRequest);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchClientMetadataResource("https://chatgpt.com/oauth/codex/client.json", {
        redirect: "error",
      }),
    ).resolves.toBeInstanceOf(Response);

    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[0];
    expect(request).toBeInstanceOf(WorkerRequest);
    expect(request.redirect).toBe("manual");
  });
});
