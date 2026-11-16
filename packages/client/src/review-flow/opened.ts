import type { ReviewScopeKind } from "@lymi/core/analytics";

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

/** The scope's target, so two reviews that share a leg key are still distinct. */
export function reviewOpenedTarget(
  scope: ReviewScopeKind,
  review: { deck?: string | undefined; series?: string | undefined; section?: string | undefined },
  list?: { round?: string | undefined; cards?: readonly string[] | undefined },
): string {
  switch (scope) {
    case "section":
      return review.section ?? "";
    case "deck":
      return review.deck ?? "";
    case "series":
      return review.series ?? "";
    case "chosen":
      return list?.cards ? [...list.cards].sort().join(",") : "";
    case "round":
      return list?.round ?? "forgotten";
    default:
      return "";
  }
}

/** Guard key for one review: the leg, its scope, and that scope's target. */
export function reviewOpenedKey(key: string, scope: ReviewScopeKind, target = ""): string {
  return `${key}:${scope}:${target}`;
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
