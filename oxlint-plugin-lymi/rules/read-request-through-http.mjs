import { defineRule } from "@oxlint/plugins";

const message =
  "request-bounds.test.ts cannot see a schema parsed here, so nothing makes it have a maximum " +
  "(#954, #1231). Validate with body() or query(), or wrap the schema in reader() and read the " +
  "request with readJson() or readForm(), all from server/http.ts.";

const PARSE = new Set(["parse", "safeParse", "parseAsync", "safeParseAsync"]);
const BUILT_IN = new Set(["JSON", "Date", "Number"]);
const REQUEST = /\breq(?:\.raw(?:\.clone\(\))?)?$/;
const READ = new Set(["json", "formData", "parseBody"]);

export default defineRule({
  meta: { type: "problem", schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") return;
        const object = context.sourceCode.getText(callee.object);
        const name = callee.property.name;
        const parses = PARSE.has(name) && !BUILT_IN.has(object);
        const reads = READ.has(name) && REQUEST.test(object);
        if (parses || reads) context.report({ node: callee, message });
      },
    };
  },
});
