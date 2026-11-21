import { testRule } from "../test/run.mjs";

const filename = "import.tsx";

testRule("notice-plain-text", {
  message:
    "Notice reads its body out on iOS only when it is a string, so this <Trans> is never " +
    "announced. Text with no link or markup goes in as t`…`; keep <Trans> for a body with a " +
    "link.",
  valid: [
    { filename, code: "const a = <Notice>{t`Saved`}</Notice>;" },
    {
      filename,
      code: 'const b = <Notice><Trans>Go to <Link href="/">settings</Link></Trans></Notice>;',
    },
    { filename, code: "const c = <Notice title={<Trans>Title</Trans>} />;" },
    { filename, code: "const d = <Notices><Trans>Saved</Trans></Notices>;" },
  ],
  invalid: [
    {
      filename,
      code: 'const a = <Notice tone="calm"><Trans>Saved</Trans></Notice>;',
      errors: ["<Trans>Saved</Trans>"],
    },
    {
      filename,
      code: "const b = <Notice><Trans>One</Trans><Trans>Two</Trans></Notice>;",
      errors: ["<Trans>One</Trans>"],
    },
    {
      filename,
      code: "const c = <Notice><Trans>Go <Link>x</Link></Trans><Trans>plain</Trans></Notice>;",
      errors: ["<Trans>plain</Trans>"],
    },
    {
      filename,
      code: "const d = <Notice><Notice><Trans>Inner</Trans></Notice><Trans>Outer</Trans></Notice>;",
      errors: ["<Trans>Inner</Trans>"],
    },
    {
      filename,
      code: "const e = <Notice><View><Trans>Deep</Trans></View></Notice>;",
      errors: ["<Trans>Deep</Trans>"],
    },
  ],
});
