const RELOADED = "lymi:stale-build-reload";
let reloading = false;

// A deploy replaces the hashed chunks, so a page from an older build can fail to load one.
const CHUNK_FAILURE =
  /^(?:Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS for)/;

export function isStaleChunkError(error: unknown): boolean {
  return error instanceof Error && CHUNK_FAILURE.test(error.message);
}

/** Reload onto the current deploy at most once per build; false when this build already tried. */
export function reloadOntoCurrentBuild(): boolean {
  if (reloading) return true;
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
