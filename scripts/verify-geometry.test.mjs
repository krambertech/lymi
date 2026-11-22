import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "@playwright/test";
import { cropOf, geometryNotes } from "../.agents/skills/verify/scripts/geometry.mjs";
import { measure, watchShifts } from "../.agents/skills/verify/scripts/measure.mjs";

let browser;
let page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });
});
after(() => browser?.close());

const STYLE = `<style>
  body { margin: 40px; font: 16px/24px Arial, sans-serif; }
  .row { display: flex; align-items: center; gap: 8px; }
  button, .chip { box-sizing: border-box; border: 1px solid #000; background: #fff; padding: 0 12px; height: 32px; font: inherit; }
  svg { width: 16px; height: 16px; flex: none; }
</style>`;
const ICON = '<svg viewBox="0 0 16 16"><rect width="16" height="16" /></svg>';

async function notes(html) {
  await page.setContent(`${STYLE}<main>${html}</main>`);
  return geometryNotes(await page.evaluate(measure)).map(
    ({ rule, detail }) => `${rule}: ${detail}`,
  );
}

test("a row of controls with one height and one centre has nothing to say", async () => {
  assert.deepEqual(
    await notes(
      `<h1>Deck</h1><div class="row"><button>Filter</button><button>Sort</button><input aria-label="Search" style="box-sizing:border-box;height:32px"></div>`,
    ),
    [],
  );
});

test("neighbours whose heights differ by 1 to 6 px are named with both sizes", async () => {
  const row = (height) =>
    notes(
      `<div class="row"><button>Filter</button><div><button style="height:${height}px">Sort</button></div></div>`,
    );
  assert.deepEqual(await row(34), [
    "height: button “Filter” is 32 px high and button “Sort” 34 px, 2 px apart",
  ]);
  assert.equal((await row(38)).length, 1);
  assert.deepEqual(await row(40), []);
});

test("a field is as high as the box drawn around it", async () => {
  const field = (height) =>
    notes(
      `<div class="row"><button>Filter</button><label class="row" style="box-sizing:border-box;height:${height}px;border:1px solid"><input aria-label="Search" style="border:0;background:transparent;height:20px"></label></div>`,
    );
  assert.deepEqual(await field(32), []);
  assert.deepEqual(await field(36), [
    "height: button “Filter” is 32 px high and input “Search” 36 px, 4 px apart",
  ]);
});

test("controls centred apart in one row are named, and stacked or floating ones are not", async () => {
  assert.deepEqual(
    await notes(
      `<div class="row" style="align-items:start"><button>Archive</button><button style="margin-top:3px">Cancel</button></div>`,
    ),
    ["centre: button “Archive” and button “Cancel” are centred 3 px apart in one row"],
  );
  assert.deepEqual(
    await notes(
      `<div style="position:relative"><button style="display:block">Archive</button><button style="display:block;height:34px">Cancel</button><button style="position:absolute;top:2px;left:200px">Close</button></div>`,
    ),
    [],
  );
});

test("a switch is not compared with a button's height, only its centre", async () => {
  const row = (margin) =>
    notes(
      `<div class="row" style="align-items:start"><button>Edit</button><button role="switch" aria-label="Known" style="height:28px;margin-top:${margin}px"></button></div>`,
    );
  assert.deepEqual(await row(2), []);
  assert.match((await row(4)).join(), /^centre: button “Edit” and switch “Known” are centred 2 px/);
});

test("an icon more than 1 px off its text's first line is named", async () => {
  const label = (shift) =>
    notes(
      `<p class="row"><span style="position:relative;top:${shift}px;line-height:0">${ICON}</span><span>Review</span></p>`,
    );
  assert.deepEqual(await label(0), []);
  assert.match(
    (await label(3)).join(),
    /^icon: the icon of p “Review” is .* px below the middle of “Review”$/,
  );
});

test("an icon centred on two lines of text is meant", async () => {
  assert.deepEqual(
    await notes(`<p class="row">${ICON}<span style="width:60px">Review every card</span></p>`),
    [],
  );
});

test("a control wider than its parent is named, unless the parent scrolls or it bleeds on purpose", async () => {
  const inside = (parent, control = "") =>
    notes(
      `<div style="width:200px;${parent}"><button style="width:240px;${control}">Add</button></div>`,
    );
  assert.deepEqual(await inside(""), ["wide: button “Add” is 240 px wide in a parent of 200 px"]);
  assert.deepEqual(await inside("overflow-x:auto"), []);
  assert.deepEqual(await inside("", "margin:0 -20px"), []);
});

test("a heading larger than the h1 of the same page or dialog is named", async () => {
  const h1 = '<h1 style="font-size:20px">Deck</h1>';
  const h2 = '<h2 style="font-size:24px">Cards</h2>';
  assert.deepEqual(await notes(h1 + h2), [
    "heading: h2 “Cards” is set at 24 px, larger than the 20 px h1",
  ]);
  assert.deepEqual(await notes(`${h1}<div role="dialog">${h2}</div>`), []);
  assert.deepEqual(await notes(h2), []);
});

test("content that jumps without input is named with how far it went", async () => {
  const fresh = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await fresh.addInitScript(watchShifts);
  await fresh.goto(
    "data:text/html,<body style='margin:0'><div id=top></div><p style='margin:0;height:300px'>Nine cards due</p>",
  );
  await fresh.waitForTimeout(100);
  await fresh.evaluate(() => {
    document.getElementById("top").style.height = "120px";
  });
  await fresh.waitForFunction(() => window.lymiShifts.length > 0);
  const [note, ...rest] = geometryNotes(await fresh.evaluate(measure));
  assert.match(note.detail, /^p “Nine cards due” moved 0 px across and 120 px down, without input/);
  assert.deepEqual(rest, []);
  assert.deepEqual(geometryNotes(await fresh.evaluate(measure)), []);
  await fresh.close();
});

test("the same pair keeps one key while its label changes", async () => {
  const keys = [];
  for (const label of ["Filter", "Filter, 1 on"]) {
    await page.setContent(
      `${STYLE}<main><div class="row"><button>${label}</button><button style="height:34px">Sort</button></div></main>`,
    );
    keys.push(geometryNotes(await page.evaluate(measure))[0].key);
  }
  assert.equal(keys[0], keys[1]);
});

test("a crop stays inside the viewport", () => {
  assert.deepEqual(cropOf({ x: 4, y: 580, w: 100, h: 32 }, { w: 800, h: 600 }), {
    x: 0,
    y: 556,
    width: 128,
    height: 44,
  });
});
