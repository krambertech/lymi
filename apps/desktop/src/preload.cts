// The page's only reach into the app, as `window.lymiDesktop`. Typed by the shared contract in
// `packages/client/src/desktop.ts`; a sandboxed preload loads no other file, so it is types only.
import type { AskApp, DesktopBridge, ToApp, ToPage } from "@lymi/client/desktop";

import electron = require("electron");

const { contextBridge, ipcRenderer } = electron;

const send = <C extends keyof ToApp>(channel: C, ...args: ToApp[C]) =>
  ipcRenderer.send(channel, ...args);
const ask = <C extends keyof AskApp>(channel: C, ...args: AskApp[C]["args"]) =>
  ipcRenderer.invoke(channel, ...args) as Promise<AskApp[C]["result"]>;

/**
 * A message the app sends while the page is still starting, such as a menu command that opened
 * the window, waits here until the page listens, and then reaches it once.
 */
const waiting = new Map<keyof ToPage, unknown[]>();
const listening = new Map<keyof ToPage, (value: never) => void>();
for (const channel of ["panel:shown", "menu:command", "app:navigate"] as const) {
  ipcRenderer.on(channel, (_event, value: unknown) => {
    const listener = listening.get(channel);
    if (listener) listener(value as never);
    else waiting.set(channel, [...(waiting.get(channel) ?? []), value]);
  });
}
function held<C extends keyof ToPage>(channel: C, listener: (value: ToPage[C]) => void) {
  listening.set(channel, listener as (value: never) => void);
  for (const value of waiting.get(channel) ?? []) listener(value as ToPage[C]);
  waiting.delete(channel);
  return () => {
    if (listening.get(channel) === listener) listening.delete(channel);
  };
}

ipcRenderer.on("window:full-screen", (_event, on: ToPage["window:full-screen"]) => {
  if (on) document.documentElement.dataset.fullScreen = "";
  else delete document.documentElement.dataset.fullScreen;
});

const bridge = {
  version: 3,
  hidePanel: () => send("panel:hide"),
  resizePanel: (height) => send("panel:resize", height),
  setPanelBackground: (color) => send("panel:background", color),
  added: () => send("panel:added"),
  openApp: (path) => send("app:open", path),
  onPanelShown: (listener) => held("panel:shown", listener),
  preferences: () => ask("prefs:get"),
  setPreference: (key, value) => ask("prefs:set", key, value),
  allowAccessibility: () => send("prefs:accessibility"),
  setRecordingShortcut: (on) => send("prefs:recording", on),
  onNavigate: (listener) => held("app:navigate", listener),
  onMenuCommand: (listener) => held("menu:command", listener),
  signIn: (provider) => send("app:sign-in", provider),
  restartToUpdate: () => send("app:restart-to-update"),
  onUpdate: (listener) => {
    const relay = (_event: unknown, update: ToPage["app:update"]) => listener(update);
    ipcRenderer.on("app:update", relay);
    return () => {
      ipcRenderer.removeListener("app:update", relay);
    };
  },
} satisfies DesktopBridge;

contextBridge.exposeInMainWorld("lymiDesktop", bridge);
