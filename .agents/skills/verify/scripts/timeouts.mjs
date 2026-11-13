// Tells a step that waited out its limit from one that met the wrong value. See ../SKILL.md.

import { stripVTControlCharacters } from "node:util";

/** Playwright waited out its limit for a page, control or element, which a loaded machine can cause too. */
export function timedOut(error) {
  if (error.name === "TimeoutError") return true;
  // An assertion that never found its locator; one that found it and read another value is a failure.
  return /^Error: element\(s\) not found$/m.test(stripVTControlCharacters(error.message));
}
