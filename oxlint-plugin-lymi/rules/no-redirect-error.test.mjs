import { testRule } from "../test/run.mjs";

const filename = "feeds.ts";

testRule("no-redirect-error", {
  message:
    "Workers throws on redirect: 'error', so this fetch fails in production while tests in " +
    "Node pass. Use redirect: 'manual' and check the response for a 3xx status and its " +
    "Location header yourself.",
  valid: [
    { filename, code: 'await fetch(url, { redirect: "manual" });' },
    { filename, code: 'const { redirect = "error" } = options;' },
    { filename, code: "const a = { redirect };" },
    { filename, code: 'const b = { ["redirect"]: "error" };' },
    { filename, code: "const c = { redirect: `error` };" },
  ],
  invalid: [
    { filename, code: 'await fetch(url, { redirect: "error" });', errors: ['redirect: "error"'] },
    {
      filename,
      code: "await fetch(url, { \"redirect\": 'error' });",
      errors: ["\"redirect\": 'error'"],
    },
    { filename, code: 'const a = { redirect : "error" };', errors: ['redirect : "error"'] },
  ],
});
