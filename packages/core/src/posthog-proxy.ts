import { POSTHOG_HOST } from "./telemetry";

export const POSTHOG_PROXY_PATH = "/ingest";

// `/s/` takes session replay snapshots.
const CAPTURE_PATHS = new Set(["/e/", "/i/v0/e/", "/batch/", "/capture/", "/s/"]);
const COUNTRY = /^[A-Z]{2}$/;

type Event = { properties?: Record<string, unknown> };

function events(payload: unknown): Event[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const batch = (payload as { batch?: unknown }).batch;
    return Array.isArray(batch) ? batch : [payload as Event];
  }
  return [];
}

function countryName(code: string): string | undefined {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
  } catch {
    return undefined;
  }
}

/** Adds the edge's country to every event and reports whether any of them is cookieless. */
function annotate(payload: unknown, country: string | undefined): boolean {
  const name = country ? countryName(country) : undefined;
  let cookieless = false;
  for (const event of events(payload)) {
    if (!event || typeof event !== "object") continue;
    event.properties ??= {};
    const properties = event.properties;
    if (properties.$cookieless_mode === true) cookieless = true;
    // PostHog's own lookup would see this Worker's address, never the visitor's.
    properties.$geoip_disable = true;
    if (country) {
      properties.$geoip_country_code = country;
      if (name) properties.$geoip_country_name = name;
    }
  }
  return cookieless;
}

/**
 * Forwards an SDK capture request to PostHog. Only capture endpoints pass; the visitor's address is
 * forwarded only for cookieless events, whose daily visitor hash PostHog computes from it.
 */
export async function proxyPostHog(
  request: Request,
  edge: { country?: unknown; ip?: string | null | undefined },
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice(POSTHOG_PROXY_PATH.length) || "/";
  if (request.method !== "POST" || !CAPTURE_PATHS.has(path))
    return new Response("Not found", { status: 404 });
  const country =
    typeof edge.country === "string" && COUNTRY.test(edge.country) && edge.country !== "XX"
      ? edge.country
      : undefined;

  const type = request.headers.get("content-type") ?? "";
  const raw = await request.text();
  let body: string = raw;
  let cookieless = false;
  try {
    if (type.includes("application/x-www-form-urlencoded")) {
      const form = new URLSearchParams(raw);
      const data = form.get("data");
      if (data) {
        const payload = JSON.parse(new TextDecoder().decode(base64Bytes(data)));
        cookieless = annotate(payload, country);
        form.set("data", base64(JSON.stringify(payload)));
        body = form.toString();
      }
    } else if (url.searchParams.get("compression") !== "gzip-js") {
      const payload = JSON.parse(raw);
      cookieless = annotate(payload, country);
      body = JSON.stringify(payload);
    }
  } catch {
    body = raw;
  }

  const headers = new Headers({ "content-type": type || "application/json" });
  const agent = request.headers.get("user-agent");
  if (agent) headers.set("user-agent", agent);
  if (cookieless && edge.ip) headers.set("x-forwarded-for", edge.ip);
  const target = new URL(path, POSTHOG_HOST);
  target.search = url.search;
  try {
    const response = await fetch(target, { method: "POST", headers, body });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return new Response("Bad gateway", { status: 502 });
  }
}

function base64Bytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function base64(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
