/**
 * Synchronous storage for the outboxes: localStorage on the web, MMKV on the phone. A method may
 * throw, as a blocked localStorage does; the outboxes then keep their queue in memory.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
  /** Hears a change made outside this runtime, such as another tab; `null` means everything changed. */
  subscribe?(listener: (key: string | null) => void): () => void;
}

/** The sentences a failed request shows the learner, from the app's own catalog. */
export interface FailureMessages {
  unreachable(): string;
  signIn(): string;
  ownerOnly(): string;
  gone(): string;
  failed(): string;
}

export interface ClientConfig {
  /** The product's origin, such as `https://my.lymi.app`. The web leaves it empty and calls its own origin. */
  baseUrl?: string;
  /**
   * Headers for every request, read each time so a renewed session applies at once. The phone sends
   * its session cookie here, from Better Auth's Expo client, with `credentials: "omit"`.
   */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Defaults to `include`, which sends the web's session cookie. */
  credentials?: RequestCredentials;
  storage: KeyValueStore;
  messages: FailureMessages;
}

let current: ClientConfig | null = null;

/** Run once at startup, before any request or outbox read. */
export function configureClient(config: ClientConfig) {
  current = config;
}

export function clientConfig(): ClientConfig {
  if (!current) throw new Error("configureClient must run before the client is used");
  return current;
}
