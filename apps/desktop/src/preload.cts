// The page's only reach into the shell, as `window.lymiDesktop`; apps/web/src/client/lib/desktop.ts.
import electron = require("electron");

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld("lymiDesktop", {
  hidePanel: () => ipcRenderer.send("panel:hide"),
  resizePanel: (height: number) => ipcRenderer.send("panel:resize", height),
  setPanelBackground: (color: string) => ipcRenderer.send("panel:background", color),
  added: () => ipcRenderer.send("panel:added"),
  openApp: (path: string) => ipcRenderer.send("app:open", path),
  onPanelShown: (listener: (shown: { selection: string | null }) => void) => {
    const handler = (_event: unknown, shown: { selection: string | null }) => listener(shown);
    ipcRenderer.on("panel:shown", handler);
    return () => {
      ipcRenderer.off("panel:shown", handler);
    };
  },
});
