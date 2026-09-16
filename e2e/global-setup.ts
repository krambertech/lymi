const productUrl = "http://localhost:4173";

/** The server's answer, or null when it could not be reached at all. */
async function attempt(path: string): Promise<Response | null> {
  try {
    return await fetch(new URL(path, productUrl));
  } catch {
    return null;
  }
}

async function warm(path: string) {
  const deadline = Date.now() + 60_000;
  let last = "no answer";
  while (Date.now() < deadline) {
    const response = await attempt(path);
    if (response?.ok) {
      // Drain the body so the Worker has finished the request before the workers start.
      await response.arrayBuffer();
      return;
    }
    // The server answered, so a refusal below 500 is the route's own and waiting cannot change it.
    if (response && response.status < 500) {
      throw new Error(`${path} answered HTTP ${response.status}`);
    }
    if (response) last = `HTTP ${response.status}`;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out warming ${path}: ${last}`);
}

/**
 * Puts one authentication request through before Playwright starts its workers. The Worker
 * seeds the OAuth resource row the first time it builds Better Auth, and parallel workers
 * would otherwise race that one-time write against the single local D1.
 */
export default async function globalSetup() {
  await warm("/api/auth/get-session");
}
