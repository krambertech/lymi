// The page's only reach into the shell, as `window.lymiDesktop`; apps/web/src/client/lib/desktop.ts.
import electron = require("electron");

const { contextBridge, ipcRenderer } = electron;

contextBridge.exposeInMainWorld("lymiDesktop", {
  hidePanel: () => ipcRenderer.send("panel:hide"),
  resizePanel: (height: number) => ipcRenderer.send("panel:resize", height),
  added: () => ipcRenderer.send("panel:added"),
  openApp: (path: string) => ipcRenderer.send("app:open", path),
  onPanelShown: (listener: () => void) => {
    const handler = () => listener();
    ipcRenderer.on("panel:shown", handler);
    return () => {
      ipcRenderer.off("panel:shown", handler);
    };
  },
});
