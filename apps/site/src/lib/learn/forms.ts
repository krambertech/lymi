/**
 * Word forms as the lesson kit's explorers show them. A form is written with `|` before the part
 * to light, usually its ending: "maja|s", "loe|n". A form without `|` lights nothing.
 */
export function splitForm(form: string): { stem: string; ending: string } {
  const at = form.indexOf("|");
  return at < 0
    ? { stem: form, ending: "" }
    : { stem: form.slice(0, at), ending: form.slice(at + 1) };
}

/** The form as it is said and recorded, without its `|`. */
export function formText(form: string): string {
  return form.replace("|", "");
}

export type MorphKind = "kept" | "dropped" | "added";
export interface MorphPart {
  text: string;
  kind: MorphKind;
}

/**
 * How `from` turns into `to`, letter by letter: the letters both keep, the ones `from` drops and
 * the ones `to` adds, in reading order. The longest run of shared letters stays put, and where
 * letters are swapped the dropped ones come first: pood → poe is po, od dropped, e added.
 */
export function morph(from: string, to: string): MorphPart[] {
  const a = [...from];
  const b = [...to];
  // shared[i][j]: how many letters a[i..] and b[j..] can keep in order.
  const shared = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const row = shared[i] as number[];
      const below = shared[i + 1] as number[];
      row[j] =
        a[i] === b[j]
          ? (below[j + 1] as number) + 1
          : Math.max(below[j] as number, row[j + 1] as number);
    }
  }
  const at = (i: number, j: number) => (shared[i] as number[])[j] as number;
  const parts: MorphPart[] = [];
  const push = (text: string, kind: MorphKind) => {
    const last = parts.at(-1);
    if (last?.kind === kind) last.text += text;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j] && at(i, j) === at(i + 1, j + 1) + 1) {
      push(a[i] as string, "kept");
      i++;
      j++;
    } else if (i < a.length && (j >= b.length || at(i + 1, j) >= at(i, j + 1))) {
      push(a[i] as string, "dropped");
      i++;
    } else {
      push(b[j] as string, "added");
      j++;
    }
  }
  return parts;
}

/**
 * Where each point of a timeline sits along it, from 0 to 100, with room at both ends: the
 * earliest point near the start, the latest near the end, the rest in proportion.
 */
export function timelinePlaces(at: readonly number[], margin = 8): number[] {
  if (at.length === 0) return [];
  const low = Math.min(...at);
  const high = Math.max(...at);
  if (high === low) return at.map(() => 50);
  return at.map((value) => margin + ((value - low) / (high - low)) * (100 - 2 * margin));
}
