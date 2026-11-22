import { testRule } from "../test/run.mjs";

const filename = "command-palette.tsx";

testRule("enter-composing", {
  message:
    "Check composing(e) from lib/composing.ts before acting on Enter: an input method confirms its " +
    "word with Enter, and Safari reports that key as 229 with isComposing false (#809, #813).",
  valid: [
    {
      filename,
      code: 'const onKeyDown = (e) => { if (composing(e)) return; if (e.key === "Enter") run(); };',
    },
    { filename, code: 'const onKeyDown = (e) => { if (e.key === "Escape") close(); };' },
    {
      filename,
      code: 'const onKeyDown = (e) => { if (e.key === "Enter" || e.key === " ") pick(); };',
    },
  ],
  invalid: [
    {
      filename,
      code: `const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown") move(1);
    else if (e.key === "Enter") onRun(items[active]);
  };`,
      errors: ['e.key === "Enter"'],
    },
    {
      filename,
      code: 'const f = <input onKeyDown={(e) => { if (e.key !== "Enter") return; applyLink(); }} />;',
      errors: ['e.key !== "Enter"'],
    },
    {
      filename,
      code: 'function onKeyDown(e) { switch (e.key) { case "Enter": run(); } }',
      errors: ['"Enter"'],
    },
  ],
});
