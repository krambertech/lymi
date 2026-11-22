import assert from "node:assert/strict";
import { test } from "node:test";
import { lint, testRule } from "../test/run.mjs";

const filename = "_layout.tsx";
const full =
  "Spread FULL_SHEET from src/ui/stack.tsx: a full-height form sheet on Android is otherwise " +
  "sized from a top inset it can miss after a theme switch, leaving its foot under the keyboard (#762).";
const stack =
  "Pass SHEET_STACK.screenLayout and screenOptions from src/ui/stack.tsx, or use TabStack: " +
  "Android lays a form sheet out square and under the status bar without them (#762).";

testRule("form-sheet-options", {
  message: full,
  valid: [
    { filename, code: 'const a = { presentation: "formSheet", ...FULL_SHEET };' },
    { filename, code: "const b = { sheetAllowedDetents: [0.62, 1] };" },
    { filename, code: 'const c = { sheetAllowedDetents: "fitToContents" };' },
    {
      filename,
      code: 'const d = <Stack><Stack.Screen options={{ animation: "fade" }} /></Stack>;',
    },
    {
      filename,
      code: 'const e = <Stack screenOptions={{ ...SHEET_STACK.screenOptions }} screenLayout={SHEET_STACK.screenLayout}><Stack.Screen options={{ presentation: "formSheet" }} /></Stack>;',
    },
    {
      filename,
      code: 'const f = <TabStack><Stack.Screen options={{ presentation: "formSheet" }} /></TabStack>;',
    },
  ],
  invalid: [
    {
      filename,
      code: 'const a = { presentation: "formSheet", sheetAllowedDetents: [1] };',
      errors: ["sheetAllowedDetents: [1]"],
    },
  ],
});

for (const attributes of ["", " screenLayout={SHEET_STACK.screenLayout}"]) {
  test(`form-sheet-options reports <Stack${attributes}> over a form sheet`, () => {
    const code = `const a = <Stack${attributes}><Stack.Screen options={{ presentation: "formSheet" }} /></Stack>;`;
    const [found, ...rest] = lint("form-sheet-options", filename, code);
    assert.deepEqual(rest, []);
    assert.equal(found.text, "Stack");
    assert.equal(found.message, stack);
  });
}
