import type { ReviewModeKey } from "@lymi/core";
import type { EMAIL_KINDS } from "@lymi/core/analytics";

type EmailKind = (typeof EMAIL_KINDS)[number];

/** How long a Flip link keeps showing its card. A scanner or a forwarded email has no more than this. */
export const FLIP_LINK_DAYS = 14;

/** One card for one learner: the link shows it to anyone holding it, and grades for nobody. */
export interface FlipLink {
  user: string;
  card: string;
  mode: ReviewModeKey;
  kind: EmailKind;
  /** The app language the email went out in, for a reader with no session. */
  language: string;
  /** Epoch milliseconds. */
  expires: number;
}

/** Stops learning emails for one learner. It does not expire: RFC 8058 links outlive the email. */
export interface UnsubscribeLink {
  user: string;
  kind: EmailKind;
}

const PURPOSES = { flip: "lymi-email-flip", unsubscribe: "lymi-email-unsubscribe" } as const;
type Purpose = keyof typeof PURPOSES;

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decode(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Each purpose has its own key, so a Flip link can never be replayed as an unsubscribe. */
function keyFor(secret: string, purpose: Purpose): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${PURPOSES[purpose]}:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function seal(secret: string, purpose: Purpose, value: unknown): Promise<string> {
  const body = new TextEncoder().encode(JSON.stringify(value));
  const key = await keyFor(secret, purpose);
  const signature = await crypto.subtle.sign("HMAC", key, body);
  return `${encode(body)}.${encode(new Uint8Array(signature))}`;
}

async function open(secret: string, purpose: Purpose, token: string): Promise<unknown> {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  try {
    const bytes = decode(body);
    const key = await keyFor(secret, purpose);
    if (!(await crypto.subtle.verify("HMAC", key, decode(signature), bytes))) return null;
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export const signFlipLink = (secret: string, link: FlipLink) => seal(secret, "flip", link);

/** The link's content when its signature holds, expired or not, so the page can say which. */
export async function readFlipLink(secret: string, token: string): Promise<FlipLink | null> {
  return (await open(secret, "flip", token)) as FlipLink | null;
}

export const signUnsubscribeLink = (secret: string, link: UnsubscribeLink) =>
  seal(secret, "unsubscribe", link);

export async function readUnsubscribeLink(
  secret: string,
  token: string,
): Promise<UnsubscribeLink | null> {
  return (await open(secret, "unsubscribe", token)) as UnsubscribeLink | null;
}
