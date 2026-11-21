import { testRule } from "../test/run.mjs";

const filename = "answer.tsx";

testRule("no-logical-text-align", {
  message:
    "React Native ignores text-end and text-start, so the text stays at the start. Use " +
    "style={TEXT_END} from src/theme/type.ts, or align the parent with items-end.",
  valid: [
    { filename, code: 'const a = <Text className="items-end" />;' },
    { filename, code: 'const b = { "text-end": true };' },
    { filename, code: 'import end from "text-end";' },
    { filename, code: 'type Side = "text-end";' },
    { filename, code: "const c = <Text>text-end</Text>;" },
    { filename, code: 'const d = "text-endless";' },
  ],
  invalid: [
    {
      filename,
      code: 'const a = <Text className="flex-1 text-end" />;',
      errors: ['"flex-1 text-end"'],
    },
    { filename, code: 'const b = "text-start";', errors: ['"text-start"'] },
    {
      filename,
      code: 'const c = <Text className={cond ? "text-end" : ""} />;',
      errors: ['"text-end"'],
    },
    { filename, code: 'const d = styles["text-end"];', errors: ['"text-end"'] },
    {
      filename,
      code: "const e = <Text className={`flex-1 text-end`} />;",
      errors: ["`flex-1 text-end`"],
    },
  ],
});
