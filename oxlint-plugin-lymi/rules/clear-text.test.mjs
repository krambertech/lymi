import { testRule } from "../test/run.mjs";

const filename = "search.tsx";

testRule("clear-text", {
  message:
    "Android has no clearButtonMode: draw ClearText from src/ui/search-bar.tsx after the field, " +
    "which stands in for it there (#762).",
  valid: [
    {
      filename,
      code: 'function S() { return <View><TextInput clearButtonMode="while-editing" /><ClearText value={v} onClear={c} /></View>; }',
    },
  ],
  invalid: [
    {
      filename,
      code: 'function S() { return <TextInput clearButtonMode="while-editing" />; }',
      errors: ['clearButtonMode="while-editing"'],
    },
  ],
});
