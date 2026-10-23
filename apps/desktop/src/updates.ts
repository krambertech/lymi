import { app, autoUpdater } from "electron";
import { updateFeed } from "./downloads.js";

const CHECK_EVERY_MS = 60 * 60_000;

/**
 * Downloads a new version in the background and never asks: Squirrel installs it the next time
 * Lymi quits, and `onReady` lets the tray offer to restart sooner.
 */
export function watchForUpdates(onReady: () => void) {
  const feed = updateFeed(process.platform, process.arch);
  if (!app.isPackaged || !feed) return;
  autoUpdater.setFeedURL({ url: feed, serverType: "json" });
  autoUpdater.on("update-downloaded", onReady);
  // Offline, or the feed briefly missing during a release: the next hourly check tries again.
  autoUpdater.on("error", (error) => console.error("Update check failed", error));
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), CHECK_EVERY_MS);
}

export const restartToUpdate = () => autoUpdater.quitAndInstall();
