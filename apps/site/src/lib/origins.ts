const DEFAULT_PUBLIC_SITE_ORIGIN = "https://lymi.app";
const DEFAULT_PRODUCT_ORIGIN = "https://my.lymi.app";

function configuredOrigin(value: string | undefined, fallback: string): string {
  try {
    return new URL(value ?? fallback).origin;
  } catch {
    return fallback;
  }
}

export const PUBLIC_SITE_ORIGIN = configuredOrigin(
  import.meta.env.PUBLIC_SITE_URL,
  DEFAULT_PUBLIC_SITE_ORIGIN,
);
export const PRODUCT_ORIGIN = configuredOrigin(
  import.meta.env.PUBLIC_PRODUCT_URL,
  DEFAULT_PRODUCT_ORIGIN,
);

export function publicSiteUrl(path = "/"): string {
  return new URL(path, PUBLIC_SITE_ORIGIN).toString();
}

export function productUrl(path = "/"): string {
  return new URL(path, PRODUCT_ORIGIN).toString();
}

export function publicMediaUrl(id: string): string {
  return productUrl(`/public/media/${encodeURIComponent(id)}`);
}

/** The product's sign-up form. Every Get started on the site points here. */
export function signUpUrl(): string {
  return productUrl("/login?mode=sign-up");
}
