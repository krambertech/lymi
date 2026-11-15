import { analyticsPath } from "@lymi/core/analytics";

/** The web page a phone screen stands for, so both count under one path. */
export function screenPath(pathname: string): string {
  // Apps and each app's page sit in the web's Settings, where its Apps group and app pages live.
  const path = /^\/you\/apps(\/|$)/.test(pathname)
    ? pathname.replace("/you/apps", "/settings")
    : pathname.startsWith("/you/")
      ? pathname.slice("/you".length)
      : pathname === "/library/archived"
        ? "/archived"
        : pathname;
  return analyticsPath(path, "product");
}
