import type { SignInProvider } from "@lymi/client/desktop";

export function productOrigin(packaged: boolean, override: string | undefined) {
  return new URL((!packaged && override) || "https://my.lymi.app").origin;
}

export const isLoopback = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

export const isProduct = (url: string | undefined, origin: string) =>
  URL.parse(url ?? "")?.origin === origin;

export function productUrl(path: string, origin: string) {
  const url = URL.parse(path, origin);
  return url && url.origin === origin ? url.toString() : null;
}

const EXTERNAL_SCHEMES = new Set(["https:", "http:", "mailto:"]);
const SIGN_IN_HOSTS = new Map<string, SignInProvider>([
  ["accounts.google.com", "google"],
  ["appleid.apple.com", "apple"],
]);

export const signInProvider = (url: string) =>
  SIGN_IN_HOSTS.get(URL.parse(url)?.hostname ?? "") ?? null;

export function leaving(url: string, origin: string): "stay" | "sign-in" | "browser" | "drop" {
  if (isProduct(url, origin)) return "stay";
  const parsed = URL.parse(url);
  if (signInProvider(url)) return "sign-in";
  return parsed && EXTERNAL_SCHEMES.has(parsed.protocol) ? "browser" : "drop";
}
