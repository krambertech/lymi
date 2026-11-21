import { describe, expect, it } from "vitest";
import { download, downloadCapture, downloadCaptureRequest, downloadHref } from "./downloads";

function visit(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://lymi.app${path}`, { headers });
}

function capture(request: Request, edge = {}) {
  const body = downloadCapture(request, edge);
  return body ? JSON.parse(body) : undefined;
}

describe("download", () => {
  it("sends each chip to its newest build", () => {
    expect(download("/download/mac")?.file).toBe(
      "https://downloads.lymi.app/darwin/arm64/Lymi.dmg",
    );
    expect(download("/download/mac-intel/")?.file).toBe(
      "https://downloads.lymi.app/darwin/x64/Lymi.dmg",
    );
    expect(download("/download")).toBeUndefined();
    expect(download("/download/windows")).toBeUndefined();
  });
});

describe("downloadHref", () => {
  it("names the page's language only when it is not English", () => {
    expect(downloadHref("/download/mac", "en")).toBe("/download/mac");
    expect(downloadHref("/download/mac-intel", "uk")).toBe("/download/mac-intel?locale=uk");
  });
});

describe("downloadCapture", () => {
  it("counts a click from the download page as a cookieless visitor with its first touch", () => {
    const event = capture(
      visit("/download/mac?lp=%2Fuk%2Fchangelog&ref=news.ycombinator.com&utm_source=hn", {
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

  it("counts the iPhone link as its own event, with no chip", () => {
    const event = capture(
      visit("/download/iphone?locale=ru", { referer: "https://lymi.app/ru/download" }),
    );
    expect(event.event).toBe("iphone_download_started");
    expect(event.properties).toMatchObject({ from: "/ru/download", ui_locale: "ru" });
    expect(event.properties).not.toHaveProperty("chip");
  });

  it("counts the Android link as its own event, with no chip", () => {
    const event = capture(
      visit("/download/android?locale=uk", { referer: "https://lymi.app/uk/changelog" }),
    );
    expect(event.event).toBe("android_download_started");
    expect(event.properties).toMatchObject({ from: "/uk/changelog", ui_locale: "uk" });
    expect(event.properties).not.toHaveProperty("chip");
  });

  it("names a direct visit's landing page and no referring page", () => {
    const event = capture(visit("/download/mac-intel"));
    expect(event.properties.chip).toBe("intel");
    expect(event.properties.first_landing_page).toBe("/download/mac-intel");
    expect(event.properties).not.toHaveProperty("from");
    expect(event.properties.ui_locale).toBe("en");
  });

  it("keeps another site's page and the query out of the event", () => {
    const event = capture(
      visit("/download/mac?utm_term=secret", { referer: "https://example.com/private/page" }),
    );
    expect(event.properties).not.toHaveProperty("from");
    expect(event.properties.referrer).toBe("example.com");
    expect(JSON.stringify(event)).not.toContain("secret");
    expect(JSON.stringify(event)).not.toContain("private");
  });

  it("takes the language from the page's link before the Referer", () => {
    const linked = capture(visit("/download/mac?locale=ru"));
    expect(linked.properties.ui_locale).toBe("ru");
    const referred = capture(
      visit("/download/mac", { referer: "https://lymi.app/uk/explore/some/deep/path" }),
    );
    expect(referred.properties.from).toBe("/other");
    expect(referred.properties.ui_locale).toBe("uk");
    expect(capture(visit("/download/mac?locale=de")).properties.ui_locale).toBe("en");
  });

  it("sends nothing for an address that is not a download", () => {
    expect(downloadCapture(visit("/download"), {})).toBeUndefined();
  });
});

describe("downloadCaptureRequest", () => {
  it("goes through the site's PostHog proxy with the visitor's browser", () => {
    const request = downloadCaptureRequest(
      visit("/download/mac", { "user-agent": "Mozilla/5.0 (Macintosh)" }),
      "{}",
    );
    expect(request.url).toBe("https://lymi.app/ingest/i/v0/e/");
    expect(request.method).toBe("POST");
    expect(request.headers.get("user-agent")).toBe("Mozilla/5.0 (Macintosh)");
  });
});
