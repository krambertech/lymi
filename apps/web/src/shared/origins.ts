export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://lymi.app";
export const DEFAULT_PRODUCT_ORIGIN = "https://my.lymi.app";
export const DEFAULT_PRODUCT_RETURN_PATH = "/today";

const PRODUCT_PATHS = [
  "/app",
  "/today",
  "/library",
  "/review",
  "/settings",
  "/you",
  "/activity",
  "/archived",
  "/insights",
  "/login",
  "/consent",
  // The live design system. Its route redirects home outside local development.
  "/design",
] as const;

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

/** Routes a signed-out learner may safely resume after authentication. */
function isProtectedProductPath(pathname: string): boolean {
  return PRODUCT_PATHS.slice(0, 9).some(
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
      !(isProtectedProductPath(url.pathname) || isJoinPagePath(url.pathname))
    ) {
      return DEFAULT_PRODUCT_RETURN_PATH;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }
}
