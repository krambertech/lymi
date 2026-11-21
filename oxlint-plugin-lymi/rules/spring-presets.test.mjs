import { testRule } from "../test/run.mjs";

const filename = "card.tsx";

testRule("spring-presets", {
  message:
    "Take the spring from @lymi/design: withSpring(value, spring(PRESET)) or springIn(new " +
    "Builder(), PRESET) from src/theme/motion.ts. A single physics value keeps Reanimated 4's " +
    "heavy defaults beside it and overshoots.",
  valid: [
    { filename, code: "const a = withSpring(1, spring(SNAPPY));" },
    { filename, code: "const b = withSpring(1);" },
    { filename, code: "const c = withSpring(1, {}, done);" },
    { filename, code: "const d = FadeIn.springify?.();" },
    { filename, code: 'const e = x["damping"](10);' },
  ],
  invalid: [
    {
      filename,
      code: "const a = withSpring(1, { damping: 20 });",
      errors: ["withSpring(1, { damping: 20 })"],
    },
    {
      filename,
      code: "const b = FadeIn.springify().damping(12);",
      errors: ["FadeIn.springify().damping(12)", "FadeIn.springify()"],
    },
    {
      filename,
      code: "const c = Layout.stiffness(200).mass(1);",
      errors: ["Layout.stiffness(200).mass(1)", "Layout.stiffness(200)"],
    },
  ],
});
