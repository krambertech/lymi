import { describe, expect, it } from "vitest";
import { compareVersions, formatClientHeader, parseClientHeader } from "./client-version";

describe("the client header", () => {
  it("reads back what the phone writes", () => {
    const client = { platform: "ios", version: "1.2.0", build: "34", update: "a1b2-c3" } as const;
    expect(formatClientHeader(client)).toBe(
      "platform=ios; version=1.2.0; build=34; update=a1b2-c3",
    );
    expect(parseClientHeader(formatClientHeader(client))).toEqual(client);
  });

  it("leaves out a build or update the phone does not know", () => {
    const header = formatClientHeader({ platform: "ios", version: "1.0", build: undefined });
    expect(header).toBe("platform=ios; version=1.0");
    expect(parseClientHeader(header)).toEqual({ platform: "ios", version: "1.0" });
  });

  it("treats a missing or malformed header as no client", () => {
    for (const header of [
      null,
      "",
      "platform=ios",
      "platform=web; version=1.0.0",
      "platform=ios; version=latest",
      "platform=ios; version=1.0.0.0",
      "platform=ios; version",
      "platform=ios; version=1=2",
    ]) {
      expect(parseClientHeader(header)).toBeNull();
    }
  });

  it("drops a build or update that is not a plain token rather than refusing the client", () => {
    expect(parseClientHeader("platform=ios; version=1.0.0; build=<script>")).toEqual({
      platform: "ios",
      version: "1.0.0",
    });
  });
});

describe("compareVersions", () => {
  it("compares numerically, part by part", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareVersions("0.0.1", "0.1.0")).toBe(-1);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });
});
