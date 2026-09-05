/**
 * Short, URL-safe, time-sortable ids. 12 chars of time + 10 of randomness.
 * Works in Workers, browsers and Node (all have crypto.getRandomValues).
 */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

export function newId(): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let rand = "";
  for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
  return time + rand;
}
