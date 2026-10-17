/** What Lymi hands a provider: a finished message. Templates and preferences never live there. */
export interface OutgoingEmail {
  to: string;
  from: { email: string; name: string };
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  /** Read back from the delivery webhook, so a bounce can be told apart by kind. */
  kind: string;
}

const RESEND_API = "https://api.resend.com/emails";

/** Resend's error `name`, kept as `code` so the caller's error classes cover both providers. */
export class ResendError extends Error {
  constructor(readonly code: string) {
    super(`Resend refused the email: ${code}`);
    this.name = "ResendError";
  }
}

export async function sendWithResend(
  apiKey: string,
  email: OutgoingEmail,
  fetcher: typeof fetch = fetch,
): Promise<{ id: string }> {
  let response: Response;
  try {
    response = await fetcher(RESEND_API, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: `${email.from.name} <${email.from.email}>`,
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
        tags: [{ name: "kind", value: email.kind }],
      }),
    });
  } catch {
    throw new ResendError("network_error");
  }
  const payload = (await response.json().catch(() => null)) as {
    id?: string;
    name?: string;
  } | null;
  if (!response.ok || !payload?.id)
    throw new ResendError(payload?.name ?? `http_${response.status}`);
  return { id: payload.id };
}

/** A delivery event Lymi acts on; every other event type is acknowledged and ignored. */
export interface DeliveryProblem {
  type: "bounced" | "complained";
  to: string[];
  kind: string | null;
}

const TOLERANCE_SECONDS = 5 * 60;

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over `id.timestamp.body` with the base64
 * secret after `whsec_`, sent as one or more space-separated `v1,<signature>` entries.
 */
export async function verifyResendWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  now = Date.now(),
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;
  const sent = Number(timestamp);
  if (!Number.isFinite(sent) || Math.abs(now / 1000 - sent) > TOLERANCE_SECONDS) return false;
  let key: CryptoKey;
  try {
    const raw = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
    key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ]);
  } catch {
    return false;
  }
  const expected = base64(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)),
  );
  return signature
    .split(" ")
    .some((entry) => entry.startsWith("v1,") && timingSafeEqual(entry.slice(3), expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function deliveryProblem(body: unknown): DeliveryProblem | null {
  const event = body as {
    type?: string;
    data?: { to?: unknown; tags?: unknown };
  } | null;
  const type =
    event?.type === "email.bounced"
      ? "bounced"
      : event?.type === "email.complained"
        ? "complained"
        : null;
  if (!type) return null;
  const to = Array.isArray(event?.data?.to)
    ? event.data.to.filter((value): value is string => typeof value === "string")
    : [];
  return { type, to, kind: tagValue(event?.data?.tags, "kind") };
}

/** Resend sends tags as an object in webhooks and as a list in its API; read either. */
function tagValue(tags: unknown, name: string): string | null {
  if (Array.isArray(tags)) {
    const tag = tags.find((entry) => (entry as { name?: unknown })?.name === name) as
      | { value?: unknown }
      | undefined;
    return typeof tag?.value === "string" ? tag.value : null;
  }
  if (tags && typeof tags === "object") {
    const value = (tags as Record<string, unknown>)[name];
    return typeof value === "string" ? value : null;
  }
  return null;
}
