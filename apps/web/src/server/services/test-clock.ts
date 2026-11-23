import { vi } from "vitest";

export function holdNoon() {
  const noon = new Date();
  noon.setUTCHours(12, 0, 0, 0);
  vi.useFakeTimers({ toFake: ["Date"], now: noon });
}
