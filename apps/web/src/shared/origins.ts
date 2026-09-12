export const DEFAULT_PUBLIC_SITE_ORIGIN = "https://lymi.app";
export const DEFAULT_PRODUCT_ORIGIN = "https://my.lymi.app";
export const DEFAULT_PRODUCT_RETURN_PATH = "/today";

const PRODUCT_PATHS = [
  "/app",
  "/today",
  "/library",
  "/review",
  "/you",
  "/activity",
  "/archived",
  "/insights",
  "/login",
  "/consent",
  // The live design system. Its route redirects home outside local development.
  "/design",
] as const;

/** Browser routes owned by the product rather than the public website. */
export function isProductBrowserPath(pathname: string): boolean {
  return PRODUCT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/** Routes a signed-out learner may safely resume after authentication. */
function isProtectedProductPath(pathname: string): boolean {
  return PRODUCT_PATHS.slice(0, 8).some(
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
      !isProtectedProductPath(url.pathname)
    ) {
      return DEFAULT_PRODUCT_RETURN_PATH;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_PRODUCT_RETURN_PATH;
  }
}
