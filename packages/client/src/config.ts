export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
  subscribe?(listener: (key: string | null) => void): () => void;
}

export interface FailureMessages {
  unreachable(): string;
  signIn(): string;
  ownerOnly(): string;
  gone(): string;
  failed(): string;
}

export interface ClientConfig {
  baseUrl?: string;
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  credentials?: RequestCredentials;
  storage: KeyValueStore;
  messages: FailureMessages;
}

let current: ClientConfig | null = null;

export function configureClient(config: ClientConfig) {
  current = config;
}

export function clientConfig(): ClientConfig {
  if (!current) throw new Error("configureClient must run before the client is used");
  return current;
}
