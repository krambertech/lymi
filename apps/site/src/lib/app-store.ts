/**
 * Countries whose App Store does not sell Lymi yet: the EU, until the trader status in App Store
 * Connect is answered (apps/mobile/store/checklist.md). Cloudflare names some EU territories on
 * their own (Åland, the French overseas regions); they shop in Finland's and France's stores.
 * Empty this once Lymi is on sale there.
 */
const NOT_SOLD_IN = new Set(
  [
    "AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK",
    "AX GF GP MF MQ RE YT",
  ]
    .join(" ")
    .split(" "),
);

/** Whether the App Store sells Lymi in a Cloudflare country code. Unknown countries get the link. */
export function onAppStoreIn(country: unknown): boolean {
  return typeof country !== "string" || !NOT_SOLD_IN.has(country.toUpperCase());
}

export const APP_STORE_CHECK_PATH = "/api/app-store";
const SEEN = "lymi-app-store";

/** Shows the page's hidden App Store links when the visitor's country sells Lymi. */
export async function showAppStoreLinks(): Promise<void> {
  const links = document.querySelectorAll<HTMLElement>("[data-app-store]");
  if (links.length === 0) return;
  let available: string | null = null;
  try {
    available = sessionStorage.getItem(SEEN);
  } catch {}
  if (available === null) {
    try {
      const response = await fetch(APP_STORE_CHECK_PATH);
      if (!response.ok) return;
      const body: { available?: unknown } = await response.json();
      available = String(body.available === true);
      try {
        sessionStorage.setItem(SEEN, available);
      } catch {}
    } catch {
      return;
    }
  }
  if (available === "true") for (const link of links) link.hidden = false;
}
