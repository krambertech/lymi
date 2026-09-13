import { isLoopbackUrl } from "./origins";

/**
 * Browsers scope cookies by host and ignore the port, so each local server names its own
 * cookies and parallel worktrees cannot sign each other out. Issue 157.
 */
export function cookiePrefix(productUrl: string): string {
  if (!isLoopbackUrl(productUrl)) return "lymi";
  const url = new URL(productUrl);
  return `lymi-${url.port || (url.protocol === "https:" ? "443" : "80")}`;
}

export function devPersonaCookieName(productUrl: string): string {
  return `${cookiePrefix(productUrl)}_dev_persona`;
}
