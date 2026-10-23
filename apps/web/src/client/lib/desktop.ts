/** What the Mac app's preload offers the page; absent in a browser. `apps/desktop/src/preload.cts`. */
export interface DesktopBridge {
  hidePanel(): void;
  resizePanel(height: number): void;
  added(): void;
  openApp(path: string): void;
  /** `selection` is the text selected in the app in front, when the learner lets Lymi read it. */
  onPanelShown(listener: (shown: { selection: string | null }) => void): () => void;
}

declare global {
  interface Window {
    lymiDesktop?: DesktopBridge;
  }
}

export const desktop = (): DesktopBridge | undefined => window.lymiDesktop;

/** Pages the Mac app draws in its own windows, without the rail or the sign-in redirect. */
export const isDesktopSurface = (pathname: string) => pathname.startsWith("/desktop/");
