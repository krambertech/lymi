// The page's only reach into the shell, as `window.lymiDesktop`; apps/web/src/client/lib/desktop.ts.
import electron = require("electron");

const { contextBridge, ipcRenderer } = electron;

ipcRenderer.on("window:full-screen", (_event, on: boolean) => {
  if (on) document.documentElement.dataset.fullScreen = "";
  else delete document.documentElement.dataset.fullScreen;
});

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
  onNavigate: (listener: (path: string) => void) => {
    const handler = (_event: unknown, path: string) => listener(path);
    ipcRenderer.on("app:navigate", handler);
    return () => {
      ipcRenderer.off("app:navigate", handler);
    };
  },
  onMenuCommand: (listener: (command: string) => void) => {
    const handler = (_event: unknown, command: string) => listener(command);
    ipcRenderer.on("menu:command", handler);
    return () => {
      ipcRenderer.off("menu:command", handler);
    };
  },
  onPanelShown: (listener: (shown: { selection: string | null }) => void) => {
    const handler = (_event: unknown, shown: { selection: string | null }) => listener(shown);
    ipcRenderer.on("panel:shown", handler);
    return () => {
      ipcRenderer.off("panel:shown", handler);
    };
  },
});
