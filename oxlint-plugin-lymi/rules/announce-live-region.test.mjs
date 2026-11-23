import { testRule } from "../test/run.mjs";

const filename = "error.tsx";

testRule("announce-live-region", {
  message:
    "iOS ignores accessibilityLiveRegion: call AccessibilityInfo.announceForAccessibility in the " +
    "same component, or use Notice, SheetError or FieldError, which do (#708).",
  valid: [
    {
      filename,
      code: 'function E({ text }) { useEffect(() => { AccessibilityInfo.announceForAccessibility(text); }, [text]); return <Text accessibilityLiveRegion="polite">{text}</Text>; }',
    },
    { filename, code: "const a = <SheetError>{text}</SheetError>;" },
  ],
  invalid: [
    {
      filename,
      code: 'function E({ text }) { return <Text accessibilityLiveRegion="polite">{text}</Text>; }',
      errors: ['accessibilityLiveRegion="polite"'],
    },
    {
      filename,
      code: 'function Other() { AccessibilityInfo.announceForAccessibility("a"); } function E({ text }) { return <Text accessibilityLiveRegion="polite">{text}</Text>; }',
      errors: ['accessibilityLiveRegion="polite"'],
    },
  ],
});
