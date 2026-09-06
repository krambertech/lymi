import { describe, expect, it } from "vitest";
import { PushSubscriptionInput } from "./types";

const valid = {
  endpoint: "https://push.example/subscriptions/device",
  expirationTime: null,
  keys: { p256dh: "base64url-key", auth: "auth-key" },
  reminderTime: "19:00",
  timezone: "Europe/Tallinn",
};

describe("push subscription input", () => {
  it("accepts a browser subscription with a quarter-hour reminder", () => {
    expect(PushSubscriptionInput.safeParse(valid).success).toBe(true);
  });

  it("rejects insecure endpoints and malformed capability keys", () => {
    expect(
      PushSubscriptionInput.safeParse({ ...valid, endpoint: "http://push.example/device" }).success,
    ).toBe(false);
    expect(
      PushSubscriptionInput.safeParse({ ...valid, keys: { ...valid.keys, auth: "not base64" } })
        .success,
    ).toBe(false);
  });

  it("rejects unsupported reminder minutes and invalid timezones", () => {
    expect(PushSubscriptionInput.safeParse({ ...valid, reminderTime: "19:10" }).success).toBe(
      false,
    );
    expect(PushSubscriptionInput.safeParse({ ...valid, timezone: "Tallinn" }).success).toBe(false);
  });

  it("rejects expiration timestamps outside the JavaScript Date range", () => {
    expect(
      PushSubscriptionInput.safeParse({ ...valid, expirationTime: 8_640_000_000_000_001 }).success,
    ).toBe(false);
  });
});
