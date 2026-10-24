import { AppLanguage } from "@lymi/core";
import { DEFAULT_PRODUCT_ORIGIN, DEFAULT_PUBLIC_SITE_ORIGIN } from "../../shared/origins";

function configuredOrigin(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}

export const PUBLIC_SITE_ORIGIN = configuredOrigin(
  "lymi-public-site-origin",
  DEFAULT_PUBLIC_SITE_ORIGIN,
);
export const PRODUCT_ORIGIN = configuredOrigin("lymi-product-origin", DEFAULT_PRODUCT_ORIGIN);

export function publicSiteUrl(path = "/"): string {
  return new URL(path, PUBLIC_SITE_ORIGIN).toString();
}

/** A public page in the app's language, since the site serves `/uk/` and `/ru/` editions of it. */
export function localizedSiteUrl(path: string, locale: string): string {
  const edition = AppLanguage.safeParse(locale).success && locale !== "en";
  return publicSiteUrl(edition ? `/${locale}${path}` : path);
}

export function productUrl(path = "/"): string {
  return new URL(path, PRODUCT_ORIGIN).toString();
}
