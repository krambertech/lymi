import { describe, expect, it, vi } from "vitest";
import { ServiceError } from "./context";
import { fetchRemoteImage } from "./image-import";

const bytes = (parts: number[]) => Uint8Array.from(parts);

describe("fetchRemoteImage", () => {
  const picture = bytes([0xff, 0xd8, 0xff, 0xe0]);

  it("refuses private, credentialed and unusual destinations without fetching", async () => {
    const fetcher = vi.fn();
    for (const link of [
      "http://127.0.0.1/a.png",
      "http://localhost/a.png",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/a.png",
      "http://10.0.0.5/a.png",
      "https://user:secret@example.com/a.png",
      "https://example.com:8443/a.png",
      "ftp://example.com/a.png",
      "file:///etc/passwd",
    ]) {
      await expect(fetchRemoteImage(link, fetcher)).rejects.toBeInstanceOf(ServiceError);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("checks every redirect and never follows one to a private host", async () => {
    const fetcher = vi.fn(async (request: Request) => {
      expect(request.redirect).toBe("manual");
      return new Response(null, { status: 302, headers: { location: "http://192.168.1.1/x" } });
    });
    await expect(fetchRemoteImage("https://example.com/sign.png", fetcher)).rejects.toThrow(
      "public http or https link",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("follows a public redirect and keeps only the final host", async () => {
    const fetcher = vi.fn(async (request: Request) =>
      request.url.startsWith("https://example.com")
        ? new Response(null, {
            status: 301,
            headers: { location: "https://cdn.example.org/s.jpg?token=abc" },
          })
        : new Response(picture),
    );
    await expect(fetchRemoteImage("https://example.com/s", fetcher)).resolves.toEqual({
      bytes: picture,
      host: "cdn.example.org",
    });
  });

  it("refuses a body over the size limit without reading all of it", async () => {
    const fetcher = async () =>
      new Response("x", { headers: { "content-length": String(11 * 1024 * 1024) } });
    await expect(fetchRemoteImage("https://example.com/big.png", fetcher)).rejects.toThrow(
      "too large",
    );
  });

  it("never repeats the link in an error", async () => {
    const link = "https://example.com/private-token-123.png";
    const failures = [
      async () => new Response("nope", { status: 404 }),
      async () => {
        throw new TypeError(`fetch failed for ${link}`);
      },
    ];
    for (const fetcher of failures) {
      const error = await fetchRemoteImage(link, fetcher).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ServiceError);
      expect(
        JSON.stringify({
          message: (error as Error).message,
          details: (error as ServiceError).details,
        }),
      ).not.toContain("private-token");
    }
  });
});
