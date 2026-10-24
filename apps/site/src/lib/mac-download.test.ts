import { describe, expect, it } from "vitest";
import {
  downloadCapture,
  downloadCaptureRequest,
  macDownload,
  macDownloadHref,
} from "./mac-download";

function download(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://lymi.app${path}`, { headers });
}

function capture(request: Request, edge = {}) {
  const body = downloadCapture(request, edge);
  return body ? JSON.parse(body) : undefined;
}

describe("macDownload", () => {
  it("sends each chip to its newest build", () => {
    expect(macDownload("/download/mac")?.file).toBe(
      "https://downloads.lymi.app/darwin/arm64/Lymi.dmg",
    );
    expect(macDownload("/download/mac-intel/")?.file).toBe(
      "https://downloads.lymi.app/darwin/x64/Lymi.dmg",
    );
    expect(macDownload("/download")).toBeUndefined();
    expect(macDownload("/download/windows")).toBeUndefined();
  });
});

describe("macDownloadHref", () => {
  it("names the page's language only when it is not English", () => {
    expect(macDownloadHref("/download/mac", "en")).toBe("/download/mac");
    expect(macDownloadHref("/download/mac-intel", "uk")).toBe("/download/mac-intel?locale=uk");
  });
});

describe("downloadCapture", () => {
  it("counts a click from the download page as a cookieless visitor with its first touch", () => {
    const event = capture(
      download("/download/mac?lp=%2Fuk%2Fchangelog&ref=news.ycombinator.com&utm_source=hn", {
        referer: "https://lymi.app/uk/download",
        "user-agent": "Mozilla/5.0 (Macintosh)",
      }),
      { timezone: "Europe/Kyiv" },
    );
    expect(event.event).toBe("mac_download_started");
    expect(event.distinct_id).toBe("$posthog_cookieless");
    expect(event.properties).toMatchObject({
      chip: "apple_silicon",
      from: "/uk/download",
      first_landing_page: "/uk/changelog",
      referrer: "news.ycombinator.com",
      utm_source: "hn",
      ui_locale: "uk",
      surface: "public",
      $cookieless_mode: true,
      $process_person_profile: false,
      $current_url: "https://lymi.app/download/mac",
      $raw_user_agent: "Mozilla/5.0 (Macintosh)",
      $timezone: "Europe/Kyiv",
    });
  });

  it("names a direct visit's landing page and no referring page", () => {
    const event = capture(download("/download/mac-intel"));
    expect(event.properties.chip).toBe("intel");
    expect(event.properties.first_landing_page).toBe("/download/mac-intel");
    expect(event.properties).not.toHaveProperty("from");
    expect(event.properties.ui_locale).toBe("en");
  });

  it("keeps another site's page and the query out of the event", () => {
    const event = capture(
      download("/download/mac?utm_term=secret", { referer: "https://example.com/private/page" }),
    );
    expect(event.properties).not.toHaveProperty("from");
    expect(event.properties.referrer).toBe("example.com");
    expect(JSON.stringify(event)).not.toContain("secret");
    expect(JSON.stringify(event)).not.toContain("private");
  });

  it("takes the language from the page's link before the Referer", () => {
    const linked = capture(download("/download/mac?locale=ru"));
    expect(linked.properties.ui_locale).toBe("ru");
    const referred = capture(
      download("/download/mac", { referer: "https://lymi.app/uk/explore/some/deep/path" }),
    );
    expect(referred.properties.from).toBe("/other");
    expect(referred.properties.ui_locale).toBe("uk");
    expect(capture(download("/download/mac?locale=de")).properties.ui_locale).toBe("en");
  });

  it("sends nothing for an address that is not a download", () => {
    expect(downloadCapture(download("/download"), {})).toBeUndefined();
  });
});

describe("downloadCaptureRequest", () => {
  it("goes through the site's PostHog proxy with the visitor's browser", () => {
    const request = downloadCaptureRequest(
      download("/download/mac", { "user-agent": "Mozilla/5.0 (Macintosh)" }),
      "{}",
    );
    expect(request.url).toBe("https://lymi.app/ingest/i/v0/e/");
    expect(request.method).toBe("POST");
    expect(request.headers.get("user-agent")).toBe("Mozilla/5.0 (Macintosh)");
  });
});
