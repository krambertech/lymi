/**
 * A reader for Transit JSON, the encoding of a Mochi export's `data.json`. Keywords become
 * plain strings without their colon, lists and sets become arrays, and instants become
 * milliseconds. Both the verbose form Mochi writes and the compact form with `^ ` maps and
 * cache references are read. https://github.com/cognitect/transit-format
 */

export type TransitValue =
  | string
  | number
  | boolean
  | null
  | TransitValue[]
  | { [key: string]: TransitValue };

const CACHE_BASE = 48;
const CACHE_DIGITS = 44;
const CACHE_SIZE = CACHE_DIGITS * CACHE_DIGITS;

/** An instant as milliseconds: Mochi writes `~t` with digits, where the spec has ISO text. */
function instant(text: string): number | null {
  if (/^-?\d+$/.test(text)) return Number(text);
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? null : ms;
}

/** Decodes a parsed `data.json`. `skip` names map keys whose values are dropped unread. */
export function decodeTransit(raw: unknown, skip: ReadonlySet<string> = new Set()): TransitValue {
  const cache: string[] = [];

  const remember = (text: string, asKey: boolean) => {
    if (text.length > 3 && (asKey || /^~[:$#]/.test(text))) {
      if (cache.length === CACHE_SIZE) cache.length = 0;
      cache.push(text);
    }
  };

  /** A string as written, with cache references resolved. */
  const lookup = (text: string, asKey: boolean): string => {
    if (text[0] === "^" && text !== "^ " && text.length <= 3) {
      const digits = text.slice(1);
      const index =
        digits.length === 1
          ? digits.charCodeAt(0) - CACHE_BASE
          : (digits.charCodeAt(0) - CACHE_BASE) * CACHE_DIGITS +
            (digits.charCodeAt(1) - CACHE_BASE);
      return cache[index] ?? text;
    }
    remember(text, asKey);
    return text;
  };

  const scalar = (text: string): TransitValue => {
    if (text[0] !== "~" || text.length < 2) return text;
    const rest = text.slice(2);
    switch (text[1]) {
      case "~":
      case "^":
      case "`":
        return text.slice(1);
      case ":":
      case "$":
        return rest;
      case "t":
      case "m":
        return instant(rest);
      case "i":
      case "d":
      case "f":
      case "n":
        return Number(rest);
      case "?":
        return rest === "t";
      case "_":
        return null;
      default:
        return rest;
    }
  };

  const key = (text: string) => {
    const value = scalar(lookup(text, true));
    return typeof value === "string" ? value : String(value);
  };

  const tagged = (tag: string, value: unknown): TransitValue => {
    const inner = decode(value);
    if (tag === "dt" || tag === "t" || tag === "m") {
      return typeof inner === "number" ? inner : typeof inner === "string" ? instant(inner) : null;
    }
    if (tag === "cmap" && Array.isArray(inner)) {
      const map: Record<string, TransitValue> = {};
      for (let i = 0; i + 1 < inner.length; i += 2) map[String(inner[i])] = inner[i + 1] ?? null;
      return map;
    }
    return inner;
  };

  const map = (entries: [string, unknown][]) => {
    const out: Record<string, TransitValue> = {};
    for (const [rawKey, value] of entries) {
      const name = key(rawKey);
      if (skip.has(name)) continue;
      out[name] = decode(value);
    }
    return out;
  };

  function decode(value: unknown): TransitValue {
    if (typeof value === "string") return scalar(lookup(value, false));
    if (typeof value !== "object" || value === null) {
      return typeof value === "number" || typeof value === "boolean" ? value : null;
    }
    if (Array.isArray(value)) {
      if (value[0] === "^ ") {
        const entries: [string, unknown][] = [];
        for (let i = 1; i + 1 < value.length; i += 2)
          entries.push([String(value[i]), value[i + 1]]);
        return map(entries);
      }
      if (value.length === 2 && typeof value[0] === "string") {
        const head = lookup(value[0], false);
        if (head.startsWith("~#")) return tagged(head.slice(2), value[1]);
        return [scalar(head), decode(value[1])];
      }
      return value.map(decode);
    }
    const entries = Object.entries(value);
    const [first] = entries;
    if (entries.length === 1 && first) {
      const head = lookup(first[0], true);
      if (head.startsWith("~#")) return tagged(head.slice(2), first[1]);
      const name = scalar(head);
      const key = typeof name === "string" ? name : String(name);
      return skip.has(key) ? {} : { [key]: decode(first[1]) };
    }
    return map(entries);
  }

  return decode(raw);
}
