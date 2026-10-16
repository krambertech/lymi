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

export function publicMediaUrl(cardId: string, kind: "image" | "audio"): string {
  return productUrl(`/public/media/card/${encodeURIComponent(cardId)}/${kind}`);
}

/**
 * Every Sign in and Open Lymi on the site. The product's root sends a session to Today and a
 * visitor without one to sign-in, so someone who already has an account is never shown sign-up.
 */
export function openLymiUrl(origin = PRODUCT_ORIGIN): string {
  return new URL("/", origin).toString();
}

/**
 * The site's own /signup. It goes through the product root, so a session lands on Today, asks a
 * visitor without one for sign-up, and keeps whatever else the link carried, such as campaign tags.
 */
export function signUpRedirect(search: string): string {
  const url = new URL("/?mode=sign-up", PRODUCT_ORIGIN);
  for (const [key, value] of new URLSearchParams(search)) {
    if (key !== "mode") url.searchParams.append(key, value);
  }
  return url.toString();
}

/** The product's sign-up form. Every Get started on the site points here. */
export function signUpUrl(): string {
  return productUrl("/login?mode=sign-up");
}
