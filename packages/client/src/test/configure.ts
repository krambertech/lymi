import { configureClient } from "../config";

/** Configures the client over a map the test can read and seed, in place of the browser's storage. */
export function configureForTest(store: Map<string, string>) {
  configureClient({
    storage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
      removeItem: (k) => void store.delete(k),
      keys: () => [...store.keys()],
    },
    messages: {
      unreachable: () => "unreachable",
      signIn: () => "sign in",
      ownerOnly: () => "owner only",
      gone: () => "gone",
      failed: () => "failed",
    },
  });
}
