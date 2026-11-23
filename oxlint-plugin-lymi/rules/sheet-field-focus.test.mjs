import { testRule } from "../test/run.mjs";

const filename = "name-sheet.tsx";

testRule("sheet-field-focus", {
  message:
    "Spread useSheetFocus() from src/ui/sheet-focus.ts on a sheet's field: Android's sheet is " +
    "its own window, and autoFocus raises no keyboard there (#762).",
  valid: [
    { filename, code: "const a = <Sheet title={t}><TextInput {...focus} /></Sheet>;" },
    { filename, code: "const b = <KeyboardScroll><TextInput autoFocus /></KeyboardScroll>;" },
  ],
  invalid: [
    {
      filename,
      code: "const a = <Sheet title={t}><TextInput autoFocus /></Sheet>;",
      errors: ["autoFocus"],
    },
    {
      filename,
      code: "const b = <Sheet>{rows.map((r) => <View><Input autoFocus={r.on} /></View>)}</Sheet>;",
      errors: ["autoFocus={r.on}"],
    },
  ],
});
