import type { MacUpdate } from "@lymi/client/desktop";
import { app, autoUpdater } from "electron";
import { updateFeed } from "./downloads.js";
import { type UpdateEvent, updateAfter } from "./update-state.js";

const CHECK_EVERY_MS = 60 * 60_000;

/**
 * Downloads a new version in the background and never asks: Squirrel installs it the next time
 * Lymi quits, and `onChange` reaching `ready` lets the tray and This Mac offer to restart sooner.
 */
export function watchForUpdates(onChange: (update: MacUpdate | undefined) => void) {
  const feed = updateFeed(process.platform, process.arch);
  if (!app.isPackaged || !feed) return;
  let state: MacUpdate | undefined;
  const move = (event: UpdateEvent) => {
    const next = updateAfter(state, event);
    if (next === state) return;
    state = next;
    onChange(next);
  };
  // Before `setFeedURL`, which can fail at once when the app's signature cannot be read.
  // Offline, or the feed briefly missing during a release: the next hourly check tries again.
  autoUpdater.on("error", (error) => {
    console.error("Update check failed", error);
    move("error");
  });
  autoUpdater.on("checking-for-update", () => move("checking-for-update"));
  autoUpdater.on("update-not-available", () => move("update-not-available"));
  autoUpdater.on("update-available", () => move("update-available"));
  // On macOS every check downloads an available update again, so checking stops once one is ready.
  autoUpdater.on("update-downloaded", () => {
    clearInterval(timer);
    move("update-downloaded");
  });
  autoUpdater.setFeedURL({ url: feed, serverType: "json" });
  const check = () => {
    if (state !== "downloading") autoUpdater.checkForUpdates();
  };
  const timer = setInterval(check, CHECK_EVERY_MS);
  check();
}

export const restartToUpdate = () => autoUpdater.quitAndInstall();
