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

export function productUrl(path = "/"): string {
  return new URL(path, PRODUCT_ORIGIN).toString();
}

export function isProductSurface(): boolean {
  return (
    typeof document !== "undefined" && document.documentElement.dataset.lymiSurface === "product"
  );
}
