import { captureAnalytics, initAnalytics, visitFirstTouch } from "@lymi/client/analytics";
import { carryFirstTouch } from "@lymi/core/analytics";
import { POSTHOG_PROJECT_TOKEN } from "@lymi/core/telemetry";
import { productUrl } from "./origins";

/**
 * Cookieless visitor analytics. A link the visitor follows carries where the visit began, so the
 * next page and the product's sign-up know it without anything stored on the device.
 */
export function startAnalytics(): void {
  initAnalytics({
    token: POSTHOG_PROJECT_TOKEN,
    surface: "public",
    enabled: import.meta.env.PROD && location.origin === "https://lymi.app",
  });
  const product = new URL(productUrl()).origin;
  const follow = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    const url = new URL(link.href);
    const internal = url.origin === location.origin;
    if (!internal && url.origin !== product) return;
    if (internal && url.pathname === location.pathname && url.hash) return;
    const slug = internal ? undefined : url.pathname.match(/^\/add\/([a-z0-9-]+)$/)?.[1];
    if (slug && event.type === "click")
      captureAnalytics("add_to_lymi_clicked", { deck_slug: slug });
    const touch = visitFirstTouch("public");
    if (touch) link.href = carryFirstTouch(url, touch).toString();
  };
  document.addEventListener("click", follow, { capture: true });
  document.addEventListener("auxclick", follow, { capture: true });
}
