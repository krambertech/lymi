import type { MacUpdate } from "@lymi/client/desktop";
import { app, autoUpdater } from "electron";
import { updateFeed } from "./downloads.js";

const CHECK_EVERY_MS = 60 * 60_000;

/**
 * Downloads a new version in the background and never asks: Squirrel installs it the next time
 * Lymi quits, and `onChange` reaching `ready` lets the tray and This Mac offer to restart sooner.
 */
export function watchForUpdates(onChange: (update: MacUpdate) => void) {
  const feed = updateFeed(process.platform, process.arch);
  if (!app.isPackaged || !feed) return;
  let downloading = false;
  // Before `setFeedURL`, which can fail at once when the app's signature cannot be read.
  // Offline, or the feed briefly missing during a release: the next hourly check tries again.
  autoUpdater.on("error", (error) => {
    downloading = false;
    console.error("Update check failed", error);
  });
  autoUpdater.on("checking-for-update", () => onChange("checking"));
  autoUpdater.on("update-not-available", () => onChange("current"));
  autoUpdater.on("update-available", () => {
    downloading = true;
    onChange("downloading");
  });
  // On macOS every check downloads an available update again, so checking stops once one is ready.
  autoUpdater.on("update-downloaded", () => {
    clearInterval(timer);
    onChange("ready");
  });
  autoUpdater.setFeedURL({ url: feed, serverType: "json" });
  const check = () => {
    if (!downloading) autoUpdater.checkForUpdates();
  };
  const timer = setInterval(check, CHECK_EVERY_MS);
  check();
}

export const restartToUpdate = () => autoUpdater.quitAndInstall();
