import { testRule } from "../test/run.mjs";

const filename = "search.tsx";

testRule("dismiss-on-drag", {
  message:
    "Pass DISMISS_ON_DRAG from src/ui/keyboard.tsx: Android has no interactive keyboard " +
    "dismissal, so the keyboard stays up there (#762).",
  valid: [
    { filename, code: "const a = <FlatList keyboardDismissMode={DISMISS_ON_DRAG} />;" },
    { filename, code: 'const b = <FlatList keyboardDismissMode="on-drag" />;' },
  ],
  invalid: [
    {
      filename,
      code: 'const a = <FlatList keyboardDismissMode="interactive" />;',
      errors: ['keyboardDismissMode="interactive"'],
    },
  ],
});
