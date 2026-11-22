import { testRule } from "../test/run.mjs";

const filename = "undo-swipe.tsx";

testRule("edge-swipe", {
  message:
    "Take the hit slop from edgeSwipeSlop() in src/ui/edge-swipe.ts: Android takes both screen " +
    "edges for Back, so a swipe held to one never starts there (#762).",
  valid: [
    { filename, code: "const a = Gesture.Pan().hitSlop(edgeSwipeSlop());" },
    { filename, code: "const b = Gesture.Tap().hitSlop({ left: 8, right: 8 });" },
  ],
  invalid: [
    {
      filename,
      code: "const a = Gesture.Pan().hitSlop({ left: 0, width: 28 });",
      errors: ["Gesture.Pan().hitSlop({ left: 0, width: 28 })"],
    },
    {
      filename,
      code: "const b = Gesture.Pan().hitSlop(rtl ? { right: 0, width: 28 } : { left: 0, width: 28 });",
      errors: ["Gesture.Pan().hitSlop(rtl ? { right: 0, width: 28 } : { left: 0, width: 28 })"],
    },
  ],
});
