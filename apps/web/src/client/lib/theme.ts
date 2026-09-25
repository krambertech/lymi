export type ThemeChoice = "light" | "dark" | "system";

const KEY = "lymi-theme";

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** DESIGN.md's canvas in each theme, so the status bar and browser chrome meet the page. */
const CHROME = { light: "#f8f6f4", dark: "#130d09" } as const;

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const next = resolve(choice);
  // The tags answer the system theme; a chosen theme has to overwrite both.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = CHROME[next];
  }
  if (root.dataset.theme === next) return;
  // Swap in one frame. Per-component transitions would otherwise cascade at different speeds.
  root.classList.add("theme-switching");
  root.dataset.theme = next;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove("theme-switching")),
  );
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
  } catch {}
  applyTheme(choice);
}

export function getTheme(): ThemeChoice {
  return read();
}

/** Run once before first paint (also inlined in index.html to avoid a flash). */
export function initTheme() {
  applyTheme(read());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (read() === "system") applyTheme("system");
  });
}
