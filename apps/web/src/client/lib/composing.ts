/**
 * Whether a key belongs to an input method still building a word, as Enter confirming 猫 from ねこ.
 * Safari ends the composition before that Enter's keydown, so it reports `isComposing` false and
 * only key code 229 tells (WebKit bug 165004).
 */
export function composing(e: { nativeEvent: KeyboardEvent; keyCode: number }): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}
