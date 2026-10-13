const RELOADED = "lymi:stale-build-reload";
// TanStack Router's lazy route component reloads once per failure message it finds unset here.
const ROUTER_RELOADED = "tanstack_router_reload:Importing a module script failed.";
const HELD = "lymi:leaving";
let reloading = false;
let leaving = false;

const ACTING = ["pointerdown", "keydown"];

// Safari's aborted import names no module, so one key stops the router reloading a page being left.
function holdRouterReload() {
  try {
    if (sessionStorage.getItem(ROUTER_RELOADED) === null) {
      sessionStorage.setItem(ROUTER_RELOADED, HELD);
    }
  } catch {
    // Without storage the router reloads as it did before.
  }
}

function releaseRouterReload() {
  try {
    if (sessionStorage.getItem(ROUTER_RELOADED) === HELD)
      sessionStorage.removeItem(ROUTER_RELOADED);
  } catch {
    // Nothing was held.
  }
}

function leave() {
  leaving = true;
  holdRouterReload();
}

function stay() {
  leaving = false;
  releaseRouterReload();
  for (const type of ACTING) window.removeEventListener(type, stay, { capture: true });
}

// Leaving the page aborts its in-flight imports, which Safari reports in the stale-chunk words.
if (typeof window !== "undefined") {
  releaseRouterReload();
  window.addEventListener("beforeunload", (event) => {
    leave();
    // A page that asked first may be kept, and the learner acting on it again shows it was.
    setTimeout(() => {
      if (!event.defaultPrevented) return;
      for (const type of ACTING) window.addEventListener(type, stay, { capture: true });
    });
  });
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", () => {
    leaving = false;
    releaseRouterReload();
  });
}

// A deploy replaces the hashed chunks, so a page from an older build can fail to load one.
const CHUNK_FAILURE =
  /^(?:Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS for)/;

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && CHUNK_FAILURE.test(error.message);
}

/** True while the page is being left, when a failed chunk is the navigation's doing. */
export function isLeavingPage(): boolean {
  return leaving;
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
