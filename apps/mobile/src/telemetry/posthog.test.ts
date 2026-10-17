import { INTERNAL_ACCOUNT_IDS } from "@lymi/core/analytics";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  apiUrl: "https://my.lymi.app",
  channel: "beta",
  update: "12345678-1234-1234-1234-123456789abc" as string | undefined,
  options: undefined as
    | { before_send: (event: unknown) => { properties: Record<string, unknown> } }
    | undefined,
  captureException: vi.fn(),
  flush: vi.fn(async () => undefined),
  starts: vi.fn(),
}));

vi.mock("../auth/client", () => ({
  get API_URL() {
    return state.apiUrl;
  },
  get PHONE_CLIENT() {
    return { platform: "ios", version: "0.0.1", build: "42", update: state.update };
  },
}));
vi.mock("expo-constants", () => ({
  default: { expoConfig: { ios: { bundleIdentifier: "app.lymi" } } },
}));
vi.mock("expo-file-system", () => ({ File: class {}, Paths: { document: "unused" } }));
vi.mock("expo-updates", () => ({
  get channel() {
    return state.channel;
  },
}));
vi.mock("posthog-react-native", () => ({ default: class {} }));
vi.mock("./usage-queue", () => ({
  withUsageQueue: () =>
    class {
      constructor(_token: string, options: typeof state.options) {
        state.options = options;
        state.starts();
      }
      captureException = state.captureException;
      flush = state.flush;
    },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("__DEV__", false);
  state.apiUrl = "https://my.lymi.app";
  state.channel = "beta";
  state.update = "12345678-1234-1234-1234-123456789abc";
  state.options = undefined;
});

describe("phone release errors", () => {
  it.each([true, false])("keeps development=%s silent against a local Worker", async (dev) => {
    vi.stubGlobal("__DEV__", dev);
    state.apiUrl = "http://localhost:5241";
    const phone = await import("./posthog");
    phone.startTelemetry();
    expect(state.starts).not.toHaveBeenCalled();
    expect(phone.verifyReleaseException()).toBe(false);
  });

  it("keeps development against production silent", async () => {
    vi.stubGlobal("__DEV__", true);
    const phone = await import("./posthog");
    phone.startTelemetry();
    expect(state.starts).not.toHaveBeenCalled();
  });

  it.each(["12345678-1234-1234-1234-123456789abc", undefined])(
    "keeps release coordinates and scrubbed Hermes frames for update %s",
    async (update) => {
      state.update = update;
      const phone = await import("./posthog");
      phone.startTelemetry();
      const event = state.options?.before_send({
        event: "$exception",
        properties: {
          private: "card text",
          $exception_list: [
            {
              type: "Error",
              value: "private",
              stacktrace: {
                frames: [
                  {
                    platform: "hermes",
                    filename: "address at /private/main.jsbundle",
                    chunk_id: "chunk-123",
                    lineno: 1,
                    colno: 123,
                    context_line: "private",
                  },
                ],
              },
            },
          ],
        },
      });
      if (!event) throw new Error("Missing exception");
      expect(event.properties).toMatchObject({
        surface: "phone",
        $app_version: "0.0.1",
        $app_build: "42",
        $app_namespace: "app.lymi",
        app_update: update ?? null,
        $process_person_profile: false,
      });
      expect(event.properties.$exception_list).toMatchObject([
        {
          value: "Unexpected error",
          stacktrace: {
            frames: [
              {
                platform: "hermes",
                filename: "main.jsbundle",
                chunk_id: "chunk-123",
                lineno: 1,
                colno: 123,
              },
            ],
          },
        },
      ]);
      expect(JSON.stringify(event)).not.toContain("private");
    },
  );

  it("permits one explicit probe per internal beta launch", async () => {
    const phone = await import("./posthog");
    phone.startTelemetry();
    expect(phone.verifyReleaseException()).toBe(false);
    phone.setTelemetryLearner("external", undefined);
    expect(phone.verifyReleaseException()).toBe(false);
    phone.setTelemetryLearner([...INTERNAL_ACCOUNT_IDS][0], undefined);
    state.channel = "production";
    expect(phone.verifyReleaseException()).toBe(false);
    state.channel = "beta";
    expect(phone.verifyReleaseException()).toBe(true);
    expect(phone.verifyReleaseException()).toBe(false);
    expect(state.captureException).toHaveBeenCalledExactlyOnceWith(expect.any(Error));
    expect(state.flush).toHaveBeenCalledOnce();
  });
});
