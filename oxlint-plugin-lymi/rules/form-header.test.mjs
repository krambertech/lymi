import { testRule } from "../test/run.mjs";

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
