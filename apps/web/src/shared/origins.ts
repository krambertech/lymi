export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://lymi.app";
export const DEFAULT_PRODUCT_ORIGIN = "https://my.lymi.app";
export const DEFAULT_PRODUCT_RETURN_PATH = "/today";

/** Screens behind authentication, and so the only ones safe to resume after it. */
const PROTECTED_PRODUCT_PATHS = [
  "/app",
  "/today",
  "/library",
  "/review",
  "/settings",
  "/you",
  "/activity",
  "/archived",
  "/insights",
  "/import",
  // In-app Explore. `lymi.app/explore` is the public catalogue on the other origin; this one is
  // the signed-in learner's, so it resumes after sign-in like any other screen. ADR 0008.
  "/explore",
] as const;

/**
 * Product routes a signed-out learner reaches directly. None is a safe return path: sending
 * someone back to `/login` loops, and `/reset-password` carries a one-use token in its query.
 */
const OPEN_PRODUCT_PATHS = [
  "/login",
  "/consent",
  "/reset-password",
  // The live design system. Its route redirects home outside local development.
  "/design",
] as const;

const PRODUCT_PATHS = [...PROTECTED_PRODUCT_PATHS, ...OPEN_PRODUCT_PATHS];

/** True for localhost, 127.0.0.1 and [::1]. Decides every local-only capability. */
export function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

/** Browser routes owned by the product rather than the public website. */
export function isProductBrowserPath(pathname: string): boolean {
  return PRODUCT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** A deck's join page, `/join/<token>`. Exact `/join` is the public beta page. ADR 0011. */
export function isJoinPagePath(pathname: string): boolean {
  return /^\/join\/[A-Za-z0-9_-]+$/.test(pathname);
}

/** Where "Add to Lymi" lands for a published deck, `/add/<slug>`. ADR 0020. */
export function isAddPagePath(pathname: string): boolean {
  return /^\/add\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
}

/** Routes a signed-out learner may safely resume after authentication. */
function isProtectedProductPath(pathname: string): boolean {
  return PROTECTED_PRODUCT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Keep authentication callbacks on an internal product route. Protocol-relative URLs,
 * malformed escapes, backslashes and auth routes are rejected rather than normalised.
 */
export function safeProductReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }
  try {
    decodeURI(value);
    const url = new URL(value, "https://product.invalid");
    if (
      url.origin !== "https://product.invalid" ||
      url.hash ||
      !(
        isProtectedProductPath(url.pathname) ||
        isJoinPagePath(url.pathname) ||
        isAddPagePath(url.pathname)
      )
    ) {
      return DEFAULT_PRODUCT_RETURN_PATH;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }
}
