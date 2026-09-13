import { describe, expect, it } from "vitest";
import { cookieName } from "./join-cookie";

describe("join cookie name", () => {
  it("keeps the host-only name in production", () => {
    expect(cookieName("https://my.lymi.app")).toBe("__Host-lymi-join");
  });

  it("names the cookie after the port on a loopback server", () => {
    expect(cookieName("http://[::1]:56320")).toBe("lymi-56320-join");
  });
});
