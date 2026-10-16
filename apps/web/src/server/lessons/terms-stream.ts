/**
 * Picks whole term objects out of the reply's JSON while it is still being written, so the list
 * can fill in as the model reads. It only needs the `"terms": [ {...}, ... ]` part to be valid
 * JSON as it arrives, which structured output guarantees.
 */
export class TermsStream {
  private text = "";
  private at = 0;
  private inArray = false;
  private done = false;

  /** Every term object completed by this chunk, in order. */
  push(chunk: string): unknown[] {
    this.text += chunk;
    const found: unknown[] = [];
    if (this.done) return found;
    if (!this.inArray) {
      const key = this.text.indexOf('"terms"');
      if (key < 0) return found;
      const open = this.text.indexOf("[", key);
      if (open < 0) return found;
      this.inArray = true;
      this.at = open + 1;
    }
    for (;;) {
      const start = this.skip(this.at);
      if (start >= this.text.length) return found;
      if (this.text[start] === "]") {
        this.done = true;
        return found;
      }
      const end = objectEnd(this.text, start);
      if (end < 0) return found;
      found.push(JSON.parse(this.text.slice(start, end + 1)));
      this.at = end + 1;
    }
  }

  /** The whole reply so far. */
  get all(): string {
    return this.text;
  }

  private skip(from: number): number {
    let i = from;
    while (i < this.text.length && /[\s,]/.test(this.text[i] ?? "")) i++;
    return i;
  }
}

/** The index of the brace closing the object that opens at `start`, or -1 while it is unfinished. */
function objectEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return -1;
}
