/** The product a window may show: production when packaged, `LYMI_URL` only in development. */
export function productOrigin(packaged: boolean, override: string | undefined) {
  return new URL((!packaged && override) || "https://my.lymi.app").origin;
}

/** Local development, the only place a persona, a signal or a dev command is listened to. */
export const isLoopback = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/** The window's only trust boundary: a page, a redirect or a caller is the product's or nothing. */
export const isProduct = (url: string | undefined, origin: string) =>
  URL.parse(url ?? "")?.origin === origin;

/** A product path as a full URL, or null when it would leave the product, such as `//elsewhere`. */
export function productUrl(path: string, origin: string) {
  const url = URL.parse(path, origin);
  return url && url.origin === origin ? url.toString() : null;
}

const EXTERNAL_SCHEMES = new Set(["https:", "http:", "mailto:"]);
// Google refuses sign-in inside an app's window, and the browser holds the passkeys, so these go there.
const SIGN_IN_HOSTS = new Set(["accounts.google.com", "appleid.apple.com"]);

/** Where a link a page opens goes: kept in the window, to the browser's sign-in, out, or nowhere. */
export function leaving(url: string, origin: string): "stay" | "sign-in" | "browser" | "drop" {
  if (isProduct(url, origin)) return "stay";
  const parsed = URL.parse(url);
  if (parsed && SIGN_IN_HOSTS.has(parsed.hostname)) return "sign-in";
  return parsed && EXTERNAL_SCHEMES.has(parsed.protocol) ? "browser" : "drop";
}
