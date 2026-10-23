// The page's only reach into the shell, as `window.lymiDesktop`; apps/web/src/client/lib/desktop.ts.
import electron = require("electron");

const { contextBridge, ipcRenderer } = electron;

ipcRenderer.on("window:full-screen", (_event, on: boolean) => {
  if (on) document.documentElement.dataset.fullScreen = "";
  else delete document.documentElement.dataset.fullScreen;
});

/**
 * A message the app sends while the page is still starting, such as a menu command that opened
 * the window, waits here until the page listens, and then reaches it once.
 */
const waiting = new Map<string, string[]>();
const listening = new Map<string, (value: string) => void>();
for (const channel of ["menu:command", "app:navigate"]) {
  ipcRenderer.on(channel, (_event, value: string) => {
    const listener = listening.get(channel);
    if (listener) listener(value);
    else waiting.set(channel, [...(waiting.get(channel) ?? []), value]);
  });
}
function held(channel: string, listener: (value: string) => void) {
  listening.set(channel, listener);
  for (const value of waiting.get(channel) ?? []) listener(value);
  waiting.delete(channel);
  return () => {
    if (listening.get(channel) === listener) listening.delete(channel);
  };
}

// Methods are only ever added, never renamed or removed: the web updates long before an installed app.
contextBridge.exposeInMainWorld("lymiDesktop", {
  version: 1,
  hidePanel: () => ipcRenderer.send("panel:hide"),
  resizePanel: (height: number) => ipcRenderer.send("panel:resize", height),
  setPanelBackground: (color: string) => ipcRenderer.send("panel:background", color),
  added: () => ipcRenderer.send("panel:added"),
  openApp: (path: string) => ipcRenderer.send("app:open", path),
  preferences: () => ipcRenderer.invoke("prefs:get"),
  setPreference: (key: string, value: unknown) => ipcRenderer.invoke("prefs:set", key, value),
  allowAccessibility: () => ipcRenderer.send("prefs:accessibility"),
  setRecordingShortcut: (on: boolean) => ipcRenderer.send("prefs:recording", on),
  onNavigate: (listener: (path: string) => void) => held("app:navigate", listener),
  onMenuCommand: (listener: (command: string) => void) => held("menu:command", listener),
  onPanelShown: (listener: (shown: { selection: string | null }) => void) => {
    const handler = (_event: unknown, shown: { selection: string | null }) => listener(shown);
    ipcRenderer.on("panel:shown", handler);
    return () => {
      ipcRenderer.off("panel:shown", handler);
    };
  },
});
