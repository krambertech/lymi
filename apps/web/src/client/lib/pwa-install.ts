import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface InstallState {
  installed: boolean;
  canPrompt: boolean;
  isIOS: boolean;
}

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function installed() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ios() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

let snapshot: InstallState = { installed: installed(), canPrompt: false, isIOS: ios() };

function publish(patch: Partial<InstallState>) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (rawEvent) => {
    const event = rawEvent as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = event;
    publish({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    publish({ installed: true, canPrompt: false });
  });
}

export function useInstallState() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
    () => ({ installed: false, canPrompt: false, isIOS: false }),
  );
}

export async function promptToInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferredPrompt;
  if (!event) return "unavailable";
  await event.prompt();
  const choice = await event.userChoice;
  deferredPrompt = null;
  publish({ canPrompt: false, installed: choice.outcome === "accepted" || installed() });
  return choice.outcome;
}
