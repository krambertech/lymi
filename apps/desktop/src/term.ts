const LONGEST = 120;

export function termFromCopy(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes("\n")) return null;
  const term = trimmed.replace(/\s+/g, " ");
  return term.length <= LONGEST ? term : null;
}
