import assert from "node:assert/strict";
import { test } from "node:test";
import { lint, testRule } from "../test/run.mjs";

const filename = "new.tsx";

testRule("form-header", {
  message:
    "A form sheet's header is FormHeader from src/ui/form-header.tsx: it keeps the header " +
    "above the sheet's scroll view, which a hand-built row lets iOS cover.",
  valid: [
    { filename, code: 'const a = <GlassButton icon="back" onPress={back} />;' },
    { filename, code: 'const b = <GlassButton icon="close"></GlassButton>;' },
    { filename, code: 'const c = <GlassButton icon={"close"} />;' },
  ],
  invalid: [
    {
      filename,
      code: 'const a = <GlassButton icon="close" onPress={close} />;',
      errors: ['icon="close" onPress={close}'],
    },
    {
      filename,
      code: 'const b = <GlassButton label={t`Close`} icon="close" />;',
      errors: ['label={t`Close`} icon="close"'],
    },
  ],
});

test("form-header keeps FormHeader's own view from being flattened", () => {
  const header = (attributes) =>
    lint(
      "form-header",
      "form-header.tsx",
      `export function FormHeader() { return <View${attributes} className="flex-row" />; }`,
    );
  assert.deepEqual(header(" collapsable={false}"), []);
  assert.deepEqual(
    header("").map(({ message, text }) => [message, text]),
    [
      [
        "FormHeader's outer view takes collapsable={false}: iOS lays a form sheet's scroll view " +
          "over a header that React Native has flattened away.",
        "View",
      ],
    ],
  );
});
