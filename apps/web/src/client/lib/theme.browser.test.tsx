import { afterEach, expect, test, vi } from "vitest";
import { applyTheme, initTheme, setTheme, THEME_CHANGED } from "./theme";

const standIn = () => {
  const bridge = { setTheme: vi.fn() };
  Object.assign(window, { lymiDesktop: bridge });
  return bridge;
};

afterEach(() => {
  delete window.lymiDesktop;
  localStorage.removeItem("lymi-theme");
  delete document.documentElement.dataset.theme;
});

test("tells the Mac app the theme a window starts in and each change", () => {
  const bridge = standIn();
  applyTheme("dark");
  expect(bridge.setTheme).toHaveBeenLastCalledWith("dark");
  setTheme("system");
  expect(bridge.setTheme).toHaveBeenLastCalledWith("system");
});

test("leaves an older Mac app without the method alone", () => {
  Object.assign(window, { lymiDesktop: {} });
  expect(() => setTheme("dark")).not.toThrow();
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("follows a theme chosen in another window", () => {
  const bridge = standIn();
  const changed = vi.fn();
  window.addEventListener(THEME_CHANGED, changed, { once: true });
  initTheme();
  localStorage.setItem("lymi-theme", "dark");
  window.dispatchEvent(new StorageEvent("storage", { key: "lymi-theme" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(bridge.setTheme).toHaveBeenLastCalledWith("dark");
  expect(changed).toHaveBeenCalledOnce();
});
