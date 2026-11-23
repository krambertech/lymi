import { testRule } from "../test/run.mjs";

const filename = "screen.tsx";

testRule("worklet-no-elements", {
  message:
    "A worklet copies what it closes over, elements included. Read a flag, such as " +
    "const hasHeader = !!header, and close over that.",
  valid: [
    {
      filename,
      code: "function S({ own }) { const header = own ?? (wraps ? <Text /> : undefined); const hasHeader = !!header; const s = useAnimatedStyle(() => ({ opacity: hasHeader ? 1 : 0 })); return <A style={s}>{header}</A>; }",
    },
    {
      filename,
      code: "function S() { const mark = <Icon />; const s = useAnimatedStyle(() => ({ mark: 1, top: y.mark })); return <A style={s}>{mark}</A>; }",
    },
  ],
  invalid: [
    {
      filename,
      code: "function S({ own }) { const header = own ?? (wraps ? <Text /> : undefined); const s = useAnimatedStyle(() => ({ opacity: header ? 1 : 0 })); return <A style={s} />; }",
      errors: ["header"],
    },
    {
      filename,
      code: "function S() { const mark = <Icon />; useAnimatedReaction(() => !!mark, (now) => tell(now)); }",
      errors: ["mark"],
    },
  ],
});
