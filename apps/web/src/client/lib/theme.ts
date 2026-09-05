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

export function applyTheme(choice: ThemeChoice) {
  document.documentElement.dataset.theme = resolve(choice);
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
