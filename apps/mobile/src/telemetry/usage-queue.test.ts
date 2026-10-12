import {
  PostHogCore,
  type PostHogFetchOptions,
  type PostHogFetchResponse,
  type PostHogPersistedProperty,
} from "@posthog/core";
import { beforeEach, describe, expect, it } from "vitest";
import { withUsageQueue } from "./usage-queue";

type Sent = { event: string; distinct_id: string };

let online: boolean;
let sendable: string | undefined;
let delivered: Sent[];
// What survives the app closing: the SDK's persisted properties, queues included.
let disk: Map<string, unknown>;

class Phone extends PostHogCore {
  getLibraryId = () => "test";
  getLibraryVersion = () => "0";
  getCustomUserAgent = () => undefined;
  getPersistedProperty<T>(key: PostHogPersistedProperty): T | undefined {
    return disk.get(key) as T | undefined;
  }
  setPersistedProperty<T>(key: PostHogPersistedProperty, value: T | null): void {
    // Stored as JSON, as on the phone, so nothing in memory leaks across a launch.
    if (value === null) disk.delete(key);
    else disk.set(key, JSON.parse(JSON.stringify(value)));
  }
  async fetch(_url: string, options: PostHogFetchOptions): Promise<PostHogFetchResponse> {
    if (!online) throw new TypeError("Network request failed");
    const { batch } = JSON.parse(options.body as string) as { batch: Sent[] };
    delivered.push(...batch);
    return { status: 200, text: async () => "", json: async () => ({}) };
  }
}

const Gated = withUsageQueue(Phone, () => sendable);

function launch() {
  return new Gated("token", {
    host: "https://example.test",
    flushAt: 100,
    flushInterval: 0,
    fetchRetryCount: 0,
    disableCompression: true,
    disableRemoteConfig: true,
    disableRemoteFeatureFlags: true,
    preloadFeatureFlags: false,
  });
}

const sent = () => delivered.map((m) => `${m.event}:${m.distinct_id}`);

beforeEach(() => {
  online = true;
  sendable = undefined;
  delivered = [];
  disk = new Map();
});

describe("the usage queue", () => {
  it("holds usage until the account may send, then sends it", async () => {
    const phone = launch();
    phone.capture("app_opened", {});
    await phone.flush();
    expect(sent()).toEqual([]);

    sendable = phone.getDistinctId();
    await phone.flush();
    expect(sent()).toEqual([`app_opened:${sendable}`]);
  });

  it("sends an error report while usage waits", async () => {
    const phone = launch();
    phone.capture("$pageview", {});
    phone.capture("$exception", {});
    await phone.flush();
    expect(sent().map((s) => s.split(":")[0])).toEqual(["$exception"]);
  });

  it("drops usage captured offline when the learner opts out or signs out", async () => {
    const phone = launch();
    phone.identify("learner-a");
    sendable = "learner-a";
    online = false;
    phone.capture("app_opened", {});
    phone.capture("$pageview", {});
    await phone.flush().catch(() => undefined);
    expect(sent()).toEqual([]);

    sendable = undefined;
    phone.dropUsage();
    phone.reset();
    online = true;
    await phone.flush();
    // Even when the same learner opts back in or signs in again.
    phone.identify("learner-a");
    sendable = "learner-a";
    await phone.flush();
    expect(sent()).toEqual(["$identify:learner-a"]);
  });

  it("keeps an earlier launch's usage until its account may send", async () => {
    const before = launch();
    before.identify("learner-a");
    sendable = "learner-a";
    online = false;
    before.capture("app_opened", {});
    await before.flush().catch(() => undefined);

    sendable = undefined;
    online = true;
    const after = launch();
    await after.flush();
    expect(sent()).toEqual([]);

    sendable = "learner-a";
    await after.flush();
    expect(sent()).toEqual(["$identify:learner-a", "app_opened:learner-a"]);
  });

  it("never sends one account's usage for another", async () => {
    const before = launch();
    before.identify("learner-a");
    sendable = "learner-a";
    online = false;
    before.capture("app_opened", {});
    await before.flush().catch(() => undefined);

    online = true;
    sendable = "learner-b";
    const after = launch();
    after.identify("learner-b");
    after.capture("app_opened", {});
    await after.flush();
    expect(sent()).toEqual(["$identify:learner-b", "app_opened:learner-b"]);
  });
});
