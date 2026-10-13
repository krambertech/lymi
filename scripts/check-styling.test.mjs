import assert from "node:assert/strict";
import test from "node:test";
import { ALLOW, check, problemsIn } from "./check-styling.mjs";

test("names the token fix for raw and stock colours", () => {
  assert.match(
    problemsIn("apps/mobile/src/explore/tray.tsx", '  light: "#e8dccb",')[0],
    /raw colour #e8dccb/,
  );
  assert.match(problemsIn("apps/web/src/client/x.tsx", 'className="bg-[#fff] p-2"')[0], /#fff/);
  assert.match(problemsIn("apps/web/src/client/x.tsx", 'className="bg-slate-100"')[0], /stock/);
  assert.deepEqual(
    problemsIn("apps/web/src/client/x.tsx", "// Prototype switch for #580: the deck"),
    [],
  );
});

test("names the logical utility for each physical one", () => {
  const found = problemsIn(
    "apps/site/src/x.tsx",
    'className={clsx("ml-2 md:pr-6 -left-3 right-[13px] border-l rounded-tr-lg text-left")}',
  );
  assert.deepEqual(found, [
    "physical ml-2: use ms-2",
    "physical pr-6: use pe-6",
    "physical -left-3: use -start-3",
    "physical right-[13px]: use end-[13px]",
    "physical border-l: use border-s",
    "physical rounded-tr-lg: use rounded-se-lg",
    "physical text-left: use text-start",
  ]);
});

test("leaves centring, logical utilities and prose alone", () => {
  const line =
    'className="left-1/2 -translate-x-1/2 inset-x-0 ms-2 pe-4 start-0 rounded-lg text-start"';
  assert.deepEqual(problemsIn("apps/web/src/client/x.tsx", line), []);
  assert.deepEqual(problemsIn("apps/site/src/x.tsx", "// reads right-to-left in Arabic"), []);
});

test("flags physical style props on the phone only", () => {
  assert.deepEqual(problemsIn("apps/mobile/src/x.tsx", "  marginLeft: 8,"), [
    "physical marginLeft: use marginStart",
  ]);
  assert.deepEqual(problemsIn("apps/web/src/client/x.tsx", "  marginLeft: 8,"), []);
});

test("checks only added lines, and honours the allow comment", () => {
  const diff = [
    "diff --git a/apps/site/src/mark.tsx b/apps/site/src/mark.tsx",
    "--- a/apps/site/src/mark.tsx",
    "+++ b/apps/site/src/mark.tsx",
    "@@ -10,1 +10,4 @@",
    '-  fill="#111111"',
    `+  // ${ALLOW}: the Google mark's own colours`,
    '+  fill="#4285F4"',
    '+  <div className="pl-2" />',
    '+  fill="#34A853"',
  ].join("\n");
  assert.deepEqual(check(diff), [
    "apps/site/src/mark.tsx:12: physical pl-2: use ps-2",
    "apps/site/src/mark.tsx:13: raw colour #34A853: use a Lymi token such as bg-plate or text-text-2; dark mode is its own palette, not an inversion",
  ]);
});

test("skips tests and generated files", () => {
  const diff = ["+++ b/apps/web/src/client/x.browser.test.tsx", "@@ -0,0 +1 @@", '+ "#fff"'].join(
    "\n",
  );
  assert.deepEqual(check(diff), []);
});

test("reads an in-page link as a link, not a colour", () => {
  assert.deepEqual(problemsIn("apps/web/src/client/x.tsx", '<a href="#add">'), []);
  assert.deepEqual(problemsIn("apps/web/src/client/x.tsx", 'if (location.hash === "#face")'), []);
  assert.match(problemsIn("apps/web/src/client/x.tsx", 'color: "#fff"')[0], /#fff/);
});

test("names the logical property for physical CSS and phone offsets", () => {
  assert.deepEqual(problemsIn("apps/site/src/x.css", "  margin-left: 4px;"), [
    "physical margin-left: use margin-inline-start",
  ]);
  assert.deepEqual(problemsIn("apps/site/src/x.astro", "  border-right-color: x;"), [
    "physical border-right-color: use border-inline-end-color",
  ]);
  assert.deepEqual(problemsIn("apps/site/src/x.css", "  right: 0;"), [
    "physical right: use inset-inline-end",
  ]);
});

test("leaves centring, logical properties and a left that means remaining alone", () => {
  assert.deepEqual(problemsIn("apps/site/src/x.css", "  left: 50%;"), []);
  assert.deepEqual(problemsIn("apps/site/src/x.css", "  inset-inline-start: 0;"), []);
  assert.deepEqual(problemsIn("apps/mobile/src/data/due.ts", "  left: number | undefined,"), []);
  assert.deepEqual(problemsIn("apps/site/src/x.astro", "const { left: remaining } = props;"), []);
  assert.deepEqual(problemsIn("apps/web/src/client/x.tsx", "  left: 0,"), []);
});
