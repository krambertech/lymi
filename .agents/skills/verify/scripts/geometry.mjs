const CONTROL_HEIGHT = 72;
const OFF_MIN = 1;
const OFF_MAX = 6;
const SHIFT_VALUE = 0.01;
const SHIFT_PIXELS = 8;

const round = (n) => Math.round(n * 10) / 10;
const middle = (box) => box.y + box.h / 2;
const off = (a, b) => {
  const by = round(Math.abs(a - b));
  return by >= OFF_MIN && by <= OFF_MAX ? by : 0;
};
const overlap = (a, b) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
const union = (boxes) => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
};

function lines(controls) {
  const found = [];
  for (const control of controls.toSorted((a, b) => a.box.y - b.box.y)) {
    const line = found.find((each) =>
      each.every(
        (other) => overlap(other.box, control.box) > Math.min(other.box.h, control.box.h) / 2,
      ),
    );
    if (line) line.push(control);
    else found.push([control]);
  }
  return found
    .filter((line) => line.length > 1)
    .map((line) => line.toSorted((a, b) => a.box.x - b.box.x));
}

function pairs(list) {
  return list.flatMap((a, i) => list.slice(i + 1).map((b) => [a, b]));
}

function rowNotes({ rows }) {
  const seen = new Set();
  const notes = [];
  for (const { selector, controls } of rows) {
    const short = controls.filter((each) => each.box.h <= CONTROL_HEIGHT);
    for (const line of lines(short)) {
      const fresh = pairs(line).filter(([a, b]) => !seen.has(`${a.id}-${b.id}`));
      for (const [a, b] of fresh) seen.add(`${a.id}-${b.id}`);
      const height = fresh.find(
        ([a, b]) => a.boxed && b.boxed && !a.small && !b.small && off(a.box.h, b.box.h),
      );
      const centre = fresh.find(([a, b]) => off(middle(a.box), middle(b.box)));
      for (const [rule, pair] of [
        ["height", height],
        ["centre", centre],
      ]) {
        if (!pair) continue;
        const [a, b] = pair;
        const by = rule === "height" ? off(a.box.h, b.box.h) : off(middle(a.box), middle(b.box));
        notes.push({
          rule,
          selector,
          detail:
            rule === "height"
              ? `${a.label} is ${round(a.box.h)} px high and ${b.label} ${round(b.box.h)} px, ${by} px apart`
              : `${a.label} and ${b.label} are centred ${by} px apart in one row`,
          box: union([a.box, b.box]),
        });
      }
    }
  }
  return notes;
}

function iconNotes({ icons }) {
  return icons
    .filter(({ box, line }) => {
      const gap = Math.max(line.x - (box.x + box.w), box.x - (line.x + line.w));
      const by = round(Math.abs(middle(box) - middle(line)));
      return gap >= 0 && gap <= 24 && overlap(box, line) > 0 && by > OFF_MIN && by <= OFF_MAX;
    })
    .map(({ selector, label, box, line }) => ({
      rule: "icon",
      selector,
      detail: `the icon of ${label} is ${round(Math.abs(middle(box) - middle(line)))} px ${middle(box) < middle(line) ? "above" : "below"} the middle of “${line.text.slice(0, 40)}”`,
      box: union([box, line]),
    }));
}

function wideNotes({ wide }) {
  return wide
    .filter(({ box, parent }) => parent.w > 0 && box.w > parent.w + 1)
    .map(({ selector, label, box, parent }) => ({
      rule: "wide",
      selector,
      detail: `${label} is ${round(box.w)} px wide in a parent of ${round(parent.w)} px`,
      box: union([box, parent]),
    }));
}

function headingNotes({ headings }) {
  return headings.flatMap((heading) => {
    if (heading.level === 1) return [];
    const sizes = headings.filter((h) => h.level === 1 && h.scope === heading.scope);
    const title = Math.max(...sizes.map((h) => h.size));
    if (sizes.length === 0 || heading.size <= title) return [];
    return [
      {
        rule: "heading",
        selector: heading.selector,
        detail: `${heading.label} is set at ${round(heading.size)} px, larger than the ${round(title)} px h1`,
        box: heading.box,
      },
    ];
  });
}

function shiftNotes({ shifts }) {
  return shifts
    .filter((shift) => !shift.input && shift.value >= SHIFT_VALUE)
    .flatMap((shift) => {
      const moved = shift.sources
        .map((source) => ({
          ...source,
          by: Math.max(
            Math.abs(source.to.x - source.from.x),
            Math.abs(source.to.y - source.from.y),
          ),
        }))
        .filter((source) => source.by >= SHIFT_PIXELS && source.to.w > 0 && source.from.w > 0)
        .toSorted((a, b) => b.by * b.to.w * b.to.h - a.by * a.to.w * a.to.h);
      if (moved.length === 0) return [];
      const [{ label, from, to }] = moved;
      const rest = moved.length > 1 ? ` with ${moved.length - 1} more` : "";
      return [
        {
          rule: "shift",
          selector: label,
          detail: `${label} moved ${round(to.x - from.x)} px across and ${round(to.y - from.y)} px down${rest}, without input (score ${shift.value.toFixed(3)})`,
        },
      ];
    });
}

export function geometryNotes(measured) {
  return [
    ...rowNotes(measured),
    ...iconNotes(measured),
    ...wideNotes(measured),
    ...headingNotes(measured),
    ...shiftNotes(measured),
  ].map((note) => ({
    ...note,
    key: `${note.rule} ${note.selector.replace(/ “.*”$/, "")} ${note.detail.match(/[\d.]+ px/g)}`,
  }));
}

export function cropOf(box, viewport, pad = 24) {
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  return {
    x,
    y,
    width: Math.min(viewport.w, box.x + box.w + pad) - x,
    height: Math.min(viewport.h, box.y + box.h + pad) - y,
  };
}
