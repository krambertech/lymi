/** In sessionStorage: review legs this tab already reported as opened. */
export const REVIEW_SESSION_OPENED_KEY = "lymi-review-session-opened";

const memory = new Set<string>();

function readStored(): Set<string> {
  try {
    if (typeof sessionStorage === "undefined") return new Set();
    const raw = sessionStorage.getItem(REVIEW_SESSION_OPENED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((key) => typeof key === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function writeStored(keys: Set<string>) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(REVIEW_SESSION_OPENED_KEY, JSON.stringify([...keys]));
  } catch {}
}

export function reviewSessionAlreadyOpened(key: string): boolean {
  if (memory.has(key)) return true;
  if (!readStored().has(key)) return false;
  memory.add(key);
  return true;
}

export function rememberReviewSessionOpened(key: string) {
  memory.add(key);
  const stored = readStored();
  stored.add(key);
  writeStored(stored);
}

/** Sign-out: the next account in this tab must be able to report its own first open. */
export function forgetOpenedReviewSessions() {
  memory.clear();
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(REVIEW_SESSION_OPENED_KEY);
  } catch {}
}
