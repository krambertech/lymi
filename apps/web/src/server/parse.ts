type Fields = Record<string, unknown>;

function fieldsOf(value: unknown): Fields | null {
  return typeof value === "object" && value !== null ? (value as Fields) : null;
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return undefined;
    throw error;
  }
}

async function unlessUnreadable<T>(read: () => Promise<T>): Promise<T | undefined> {
  try {
    return await read();
    // oxlint-disable-next-line lymi/no-swallowed-failure -- A body that broke off, was read before or is not JSON is an answer every caller checks for.
  } catch {
    return undefined;
  }
}

export function bodyJson(source: { json(): Promise<unknown> }): Promise<unknown> {
  return unlessUnreadable(() => source.json());
}

export function clonedJson(source: Request | Response): Promise<unknown> {
  return unlessUnreadable(() => source.clone().json());
}

export async function bodyFields(request: Request): Promise<Fields | null> {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type === "application/json") return fieldsOf(await clonedJson(request));
  if (type !== "application/x-www-form-urlencoded") return null;
  const text = await unlessUnreadable(() => request.clone().text());
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
