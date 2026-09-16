const productUrl = "http://localhost:4173";

async function warm(path: string) {
  const deadline = Date.now() + 60_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL(path, productUrl));
      if (response.ok) {
        // Drain the body so the Worker finishes the request before the next one starts.
        await response.arrayBuffer();
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out warming ${path}: ${lastError}`);
}

/**
 * Constructs Better Auth once, before Playwright starts its workers. The Worker seeds the
 * OAuth resource row the first time it builds Better Auth, and parallel workers would
 * otherwise race that one-time write against the single local D1.
 */
export default async function globalSetup() {
  await warm("/api/auth/get-session");
  await warm("/.well-known/oauth-authorization-server");
}
