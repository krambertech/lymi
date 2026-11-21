import { testRule } from "../test/run.mjs";

const filename = "list.tsx";

testRule("scroll-view-persist-taps", {
  message:
    "Set keyboardShouldPersistTaps to handled on this scroll view: without it, the first tap " +
    "while the keyboard is up only dismisses the keyboard and the button never fires.",
  valid: [
    {
      filename,
      code: 'const a = <ScrollView keyboardShouldPersistTaps="handled">{rows}</ScrollView>;',
    },
    { filename, code: "const b = <FlatList keyboardShouldPersistTaps data={cards} />;" },
    { filename, code: "const c = <Animated.SectionList sections={s} />;" },
    { filename, code: "const d = <List.ScrollView />;" },
  ],
  invalid: [
    { filename, code: "const a = <ScrollView>{rows}</ScrollView>;", errors: ["ScrollView"] },
    {
      filename,
      code: "const b = <Animated.FlatList data={cards} />;",
      errors: ["Animated.FlatList"],
    },
    { filename, code: "const c = <SectionList {...props} />;", errors: ["SectionList"] },
    {
      filename,
      code: 'const d = <ScrollView hint="keyboardShouldPersistTaps" />;',
      errors: ["ScrollView"],
    },
  ],
});
