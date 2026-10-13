const RELOADED = "lymi:stale-build-reload";
let reloading = false;
let leaving = false;

const ACTING = ["pointerdown", "keydown"];

function stay() {
  leaving = false;
  for (const type of ACTING) window.removeEventListener(type, stay, { capture: true });
}

// Leaving the page aborts its in-flight imports, which Safari reports in the stale-chunk words.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    leaving = true;
    // A page that asked first may be kept, and the learner acting on it again shows it was.
    setTimeout(() => {
      if (!event.defaultPrevented) return;
      for (const type of ACTING) window.addEventListener(type, stay, { capture: true });
    });
  });
  window.addEventListener("pagehide", () => {
    leaving = true;
  });
  window.addEventListener("pageshow", () => {
    leaving = false;
  });
}

// A deploy replaces the hashed chunks, so a page from an older build can fail to load one.
const CHUNK_FAILURE =
  /^(?:Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS for)/;

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && CHUNK_FAILURE.test(error.message);
}

/** Reload onto the current deploy at most once per build; false when this build already tried. */
export function reloadOntoCurrentBuild(): boolean {
  if (reloading || leaving) return true;
  const build = String(import.meta.env.LYMI_BUILD ?? "dev");
  try {
    if (sessionStorage.getItem(RELOADED) === build) return false;
    sessionStorage.setItem(RELOADED, build);
  } catch {
    return false;
  }
  reloading = true;
  location.reload();
  return true;
}
