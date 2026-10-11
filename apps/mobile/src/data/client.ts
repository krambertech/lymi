import { configureClient, type KeyValueStore } from "@lymi/client";
import { getRandomValues } from "expo-crypto";
import { API_URL, sessionHeaders } from "../auth/client";

// Hermes has no Web Crypto, and core's `newId` makes every id on the device with it.
if (typeof globalThis.crypto?.getRandomValues !== "function") {
  globalThis.crypto = { ...globalThis.crypto, getRandomValues } as Crypto;
}

// The outboxes stay in memory until the phone has real data and keeps them in MMKV (#504).
const held = new Map<string, string>();
const memory: KeyValueStore = {
  getItem: (key) => held.get(key) ?? null,
  setItem: (key, value) => void held.set(key, value),
  removeItem: (key) => void held.delete(key),
  keys: () => [...held.keys()],
};

/** Every request carries the signed-in learner's session; the native cookie jar never sends a second one. */
configureClient({
  baseUrl: API_URL,
  headers: sessionHeaders,
  credentials: "omit",
  storage: memory,
  messages: {
    unreachable: () => "Couldn’t reach Lymi. Check your connection and try again.",
    signIn: () => "Sign in to continue.",
    ownerOnly: () => "Only the deck’s owner can change this.",
    gone: () => "That’s no longer here. Reload to see what changed.",
    failed: () => "That didn’t go through. Reload and try again.",
  },
});
