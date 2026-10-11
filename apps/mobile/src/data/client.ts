import { t } from "@lingui/core/macro";
import { configureClient, type KeyValueStore } from "@lymi/client";
import { bindWriteCache } from "@lymi/client/writes";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { getRandomValues } from "expo-crypto";
import { addNetworkStateListener } from "expo-network";
import { AppState } from "react-native";
import { API_URL, sessionHeaders } from "../auth/client";
import { outboxStore } from "./kept";

// Hermes has no Web Crypto, and core's `newId` makes every id on the device with it.
if (typeof globalThis.crypto?.getRandomValues !== "function") {
  globalThis.crypto = { ...globalThis.crypto, getRandomValues } as Crypto;
}

// The outboxes outlive a quit, so grades and writes made offline still replay. ADR 0023.
const storage: KeyValueStore = {
  getItem: (key) => outboxStore.getString(key) ?? null,
  setItem: (key, value) => outboxStore.set(key, value),
  removeItem: (key) => void outboxStore.remove(key),
  keys: () => outboxStore.getAllKeys(),
};

/** Every request carries the signed-in learner's session; the native cookie jar never sends a second one. */
configureClient({
  baseUrl: API_URL,
  headers: sessionHeaders,
  credentials: "omit",
  storage,
  messages: {
    unreachable: () => t`Couldn’t reach Lymi. Check your connection and try again.`,
    signIn: () => t`Sign in to continue.`,
    ownerOnly: () => t`Only the deck’s owner can change this.`,
    gone: () => t`That’s no longer here. Reload to see what changed.`,
    failed: () => t`That didn’t go through. Reload and try again.`,
  },
});

// React Native has no window events, so Query hears the connection and the app's return from the system.
onlineManager.setEventListener((setOnline) => {
  const listener = addNetworkStateListener((state) => setOnline(state.isConnected !== false));
  return () => listener.remove();
});
focusManager.setEventListener((setFocused) => {
  const listener = AppState.addEventListener("change", (state) => setFocused(state === "active"));
  return () => listener.remove();
});

export const queryClient = new QueryClient();
bindWriteCache(queryClient);
