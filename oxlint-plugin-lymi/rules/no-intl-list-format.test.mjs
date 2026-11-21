import { testRule } from "../test/run.mjs";

const filename = "members.tsx";

testRule("no-intl-list-format", {
  message:
    "Hermes has no Intl.ListFormat, so this throws on the phone. Use formatList() from " +
    "src/i18n/list.ts, which falls back to a comma list.",
  valid: [
    { filename, code: "const a = formatList(names);" },
    { filename, code: "const b = Intl?.ListFormat;" },
    { filename, code: "const c = globalThis.Intl.ListFormat;" },
    { filename, code: 'const d = Intl["ListFormat"];' },
  ],
  invalid: [
    {
      filename,
      code: "const a = new Intl.ListFormat(locale).format(names);",
      errors: ["Intl.ListFormat"],
    },
    {
      filename,
      code: 'const b = typeof Intl.ListFormat === "function";',
      errors: ["Intl.ListFormat"],
    },
  ],
});
