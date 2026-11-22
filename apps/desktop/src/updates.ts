import type { MacUpdate } from "@lymi/client/desktop";
import { app, autoUpdater } from "electron";
import { updateFeed } from "./downloads.js";
import { type UpdateEvent, updateAfter } from "./update-state.js";

const CHECK_EVERY_MS = 60 * 60_000;

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
  autoUpdater.on("error", (error) => {
    console.error("Update check failed", error);
    move("error");
  });
  autoUpdater.on("checking-for-update", () => move("checking-for-update"));
  autoUpdater.on("update-not-available", () => move("update-not-available"));
  autoUpdater.on("update-available", () => move("update-available"));
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
