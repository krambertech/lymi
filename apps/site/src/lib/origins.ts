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
 * Every Open Lymi on the site. The product's root sends a session to Today and, because of the
 * mode, a visitor without one to sign-up rather than sign-in.
 */
export function openLymiUrl(origin = PRODUCT_ORIGIN): string {
  return new URL("/?mode=sign-up", origin).toString();
}

/** The site's own /signup: the product's sign-up form, keeping whatever query the link carried. */
export function signUpRedirect(search: string): string {
  const url = new URL(signUpUrl());
  for (const [key, value] of new URLSearchParams(search)) {
    if (key !== "mode") url.searchParams.append(key, value);
  }
  return url.toString();
}

/** The product's sign-up form. Every Get started on the site points here. */
export function signUpUrl(): string {
  return productUrl("/login?mode=sign-up");
}
