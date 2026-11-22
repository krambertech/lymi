type Fields = Record<string, unknown>;

function fieldsOf(value: unknown): Fields | null {
  return typeof value === "object" && value !== null ? (value as Fields) : null;
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function unlessUnreadable<T>(reading: Promise<T>): Promise<T | undefined> {
  // oxlint-disable-next-line lymi/no-swallowed-failure -- A body that broke off or is not JSON is an answer every caller checks for.
  return reading.catch(() => undefined);
}

export function bodyJson(source: { json(): Promise<unknown> }): Promise<unknown> {
  return unlessUnreadable(source.json());
}

export async function bodyFields(request: Request): Promise<Fields | null> {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type === "application/json") return fieldsOf(await bodyJson(request.clone()));
  if (type !== "application/x-www-form-urlencoded") return null;
  const text = await unlessUnreadable(request.clone().text());
  return text === undefined ? null : Object.fromEntries(new URLSearchParams(text));
}

export function decodeBase64(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const raw = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

export function jwtClaims(token: string): Fields | null {
  const payload = decodeBase64(token.split(".")[1] ?? "");
  return payload && fieldsOf(parseJson(new TextDecoder().decode(payload)));
}

export function languageName(tag: string, locale = "en"): string | undefined {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(tag);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}
