import { testRule } from "../test/run.mjs";

const filename = "sync.ts";

testRule("no-navigator-online", {
  message:
    "React Native has no navigator.onLine, so on the phone this reads undefined and an offline " +
    "branch never runs. Use online() from @lymi/client/cache, which reads Query's connection " +
    "state there.",
  valid: [
    { filename, code: "const a = online();" },
    { filename, code: "const b = navigator?.onLine;" },
    { filename, code: "const c = window.navigator.onLine;" },
    { filename, code: 'const d = navigator["onLine"];' },
  ],
  invalid: [
    { filename, code: "if (!navigator.onLine) queue(job);", errors: ["navigator.onLine"] },
    { filename, code: "const a = navigator.onLine.valueOf();", errors: ["navigator.onLine"] },
  ],
});
