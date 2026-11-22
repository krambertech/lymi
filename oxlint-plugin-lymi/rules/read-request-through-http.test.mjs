import { testRule } from "../test/run.mjs";

const filename = "route.ts";

testRule("read-request-through-http", {
  message:
    "request-bounds.test.ts cannot see a schema parsed here, so nothing makes it have a maximum " +
    "(#954, #1231). Validate with body() or query(), or wrap the schema in reader() and read the " +
    "request with readJson() or readForm(), all from server/http.ts.",
  valid: [
    { filename, code: "const read = reader(Call, 'call'); await readJson(c, read);" },
    { filename, code: 'const input = c.req.valid("json");' },
    { filename, code: "const at = Date.parse(value); const body = JSON.parse(raw);" },
    { filename, code: "return c.json(await getDeck(ctxOf(c)));" },
    { filename, code: "const reply = await response.json();" },
  ],
  invalid: [
    {
      filename,
      code: "const parsed = AnkiConnectCall.safeParse(await c.req.json().catch(() => null));",
      errors: ["AnkiConnectCall.safeParse", "c.req.json"],
    },
    {
      filename,
      code: "const form = await c.req.formData();",
      errors: ["c.req.formData"],
    },
    {
      filename,
      code: "const { name } = await c.req.raw.clone().json();",
      errors: ["c.req.raw.clone().json"],
    },
    {
      filename,
      code: "const input = z.object({ name: z.string() }).parse(form);",
      errors: ["z.object({ name: z.string() }).parse"],
    },
  ],
});
