const ENDING = /(?<![\p{L}\p{N}])-\p{L}+(?:\/-\p{L}+)*/gu;

export function endingPieces(text: string): readonly { text: string; ending: boolean }[] {
  const pieces: { text: string; ending: boolean }[] = [];
  let at = 0;
  for (const match of text.matchAll(ENDING)) {
    if (match.index > at) pieces.push({ text: text.slice(at, match.index), ending: false });
    pieces.push({ text: match[0], ending: true });
    at = match.index + match[0].length;
  }
  if (at < text.length) pieces.push({ text: text.slice(at), ending: false });
  return pieces;
}
