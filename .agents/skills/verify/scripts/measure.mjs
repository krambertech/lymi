export function watchShifts() {
  window.lymiShifts = [];
  const describe = (node) => {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    if (!el || el.closest(".dev-skin")) return null;
    const lines = (el.innerText ?? "").split("\n").filter((line) => line.trim());
    const name = el.getAttribute("aria-label") ?? lines.slice(0, 3).join(", ");
    const inside = name ? null : el.closest("[aria-label]")?.getAttribute("aria-label");
    const slot = el.dataset?.slot;
    return `${el.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ""} ${inside ? "in " : ""}“${(inside ?? name).replace(/\s+/g, " ").trim().slice(0, 40)}”`;
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.lymiShifts.push({
        value: entry.value,
        input: entry.hadRecentInput,
        sources: entry.sources
          .map((s) => ({
            label: describe(s.node),
            from: {
              x: s.previousRect.x,
              y: s.previousRect.y,
              w: s.previousRect.width,
              h: s.previousRect.height,
            },
            to: {
              x: s.currentRect.x,
              y: s.currentRect.y,
              w: s.currentRect.width,
              h: s.currentRect.height,
            },
          }))
          .filter((s) => s.label),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
}

export async function settle() {
  const finite = (a) => Number.isFinite(a.effect?.getComputedTiming().endTime);
  const running = document.getAnimations().filter((a) => a.playState === "running" && finite(a));
  await Promise.race([
    Promise.allSettled(running.map((a) => a.finished)),
    new Promise((done) => setTimeout(done, 1000)),
  ]);
}

export function measure() {
  const CONTROL =
    "button,select,a[href],input:not([type=hidden]),[role=button],[role=switch],[role=checkbox],[role=radio],[role=combobox],[role=tab]";
  const SMALL =
    "[role=switch],[role=checkbox],[role=radio],input[type=checkbox],input[type=radio],[type=range]";
  const styles = new Map();
  const style = (el) => {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  };
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  };
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 1 &&
      r.height > 1 &&
      r.bottom > 0 &&
      r.top < innerHeight &&
      r.right > 0 &&
      r.left < innerWidth &&
      el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
      !el.closest(".dev-skin,[inert],[aria-hidden=true]:not(svg)")
    );
  };
  const text = (el) => (el.textContent ?? "").replace(/\s+/g, " ").trim();
  const floats = (el) => ["absolute", "fixed"].includes(style(el).position);
  const painted = (color) => {
    const alpha = /^rgba?\(.*?[,/]\s*([\d.]+%?)\s*\)$/.exec(color)?.[1];
    if (color === "transparent") return false;
    if (/^rgba\(/.test(color) || color.includes("/")) return Number.parseFloat(alpha) > 0;
    return true;
  };
  const boxed = (el) => {
    const s = style(el);
    return (
      painted(s.backgroundColor) ||
      s.backgroundImage !== "none" ||
      (Number.parseFloat(s.borderTopWidth) > 0 && painted(s.borderTopColor)) ||
      s.boxShadow !== "none"
    );
  };
  const ids = new Map();
  const id = (el) => {
    if (!ids.has(el)) ids.set(el, ids.size + 1);
    return ids.get(el);
  };
  const named = (el) => {
    const name = el.getAttribute("aria-label") || el.getAttribute("placeholder") || text(el);
    const slot = el.dataset?.slot;
    return `${el.getAttribute("role") ?? el.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : ""}${name ? ` “${name.slice(0, 40)}”` : ""}`;
  };
  const path = (el) => {
    const parts = [];
    for (let at = el; at && at !== document.body && parts.length < 5; at = at.parentElement) {
      const slot = at.dataset?.slot;
      const same = at.parentElement
        ? [...at.parentElement.children].filter((c) => c.tagName === at.tagName)
        : [];
      parts.unshift(
        `${at.tagName.toLowerCase()}${slot ? `[data-slot=${slot}]` : same.length > 1 ? `:nth-of-type(${same.indexOf(at) + 1})` : ""}`,
      );
      if (
        ["main", "dialog"].includes(at.tagName.toLowerCase()) ||
        at.getAttribute("role") === "dialog"
      )
        break;
    }
    return parts.join(" > ");
  };

  const isControl = (el) =>
    el.matches(CONTROL) && (el.tagName !== "A" || boxed(el) || el.hasAttribute("data-slot"));
  const fieldBox = (el) => {
    if (!el.matches("input,[role=combobox]") || el.matches(SMALL) || boxed(el)) return el;
    for (let at = el.parentElement, i = 0; at && i < 3; at = at.parentElement, i += 1) {
      if (boxed(at))
        return at.querySelectorAll("input,[role=combobox]").length === 1 && box(at).h <= 72
          ? at
          : el;
    }
    return el;
  };
  const control = (el) => {
    const visual = fieldBox(el);
    return {
      id: id(el),
      label: named(el),
      small: el.matches(SMALL),
      boxed: boxed(visual),
      box: box(visual),
    };
  };
  const controlsOnly = (child) => {
    if (floats(child) || !shown(child)) return [];
    if (isControl(child)) return [child];
    const inside = [...child.querySelectorAll(CONTROL)].filter(
      (el) => isControl(el) && shown(el) && !el.parentElement.closest(CONTROL),
    );
    if (inside.length === 0 || inside.length > 6) return [];
    const within = inside.map(text).join("").replace(/\s/g, "").length;
    return text(child).replace(/\s/g, "").length === within ? inside : [];
  };

  const rows = [];
  for (const parent of document.body.querySelectorAll("*")) {
    if (parent.children.length < 2 || parent.closest("svg") || !shown(parent)) continue;
    const kids = [...parent.children].flatMap(controlsOnly);
    if (kids.length > 1 && kids.length <= 24)
      rows.push({ selector: path(parent), controls: kids.map(control) });
  }

  const firstLine = (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (
      let at = node.nodeType === Node.TEXT_NODE ? node : walker.nextNode();
      at;
      at = walker.nextNode()
    ) {
      if (!at.textContent.trim() || !at.parentElement || !shown(at.parentElement)) continue;
      if (at.parentElement.closest("rt,sup,sub,kbd")) continue;
      const range = document.createRange();
      range.selectNodeContents(at);
      const line = [...range.getClientRects()].find((r) => r.width > 1);
      if (line)
        return { x: line.x, y: line.y, w: line.width, h: line.height, text: at.textContent.trim() };
    }
    return null;
  };
  const icons = [];
  for (const svg of document.body.querySelectorAll("svg")) {
    const b = box(svg);
    if (b.w < 10 || b.w > 32 || b.h < 10 || b.h > 32 || !shown(svg) || svg.closest("svg svg"))
      continue;
    let at = svg;
    while (at.parentElement && !text(at.parentElement) && at.parentElement.children.length === 1)
      at = at.parentElement;
    const parent = at.parentElement;
    if (!parent || floats(at) || !style(parent).display.endsWith("flex")) continue;
    if (!style(parent).flexDirection.startsWith("row")) continue;
    if (style(parent).alignItems.includes("baseline")) continue;
    const beside = [at.nextSibling, at.previousSibling].find(
      (n) =>
        n && n.textContent.trim() && !(n.nodeType === Node.ELEMENT_NODE && n.tagName === "svg"),
    );
    const line = beside && firstLine(beside);
    if (line)
      icons.push({ id: id(svg), selector: path(parent), label: named(parent), box: b, line });
  }

  const wide = [];
  for (const el of document.body.querySelectorAll(CONTROL)) {
    if (!isControl(el) || !shown(el) || floats(el)) continue;
    const s = style(el);
    if (Number.parseFloat(s.marginLeft) < 0 || Number.parseFloat(s.marginRight) < 0) continue;
    let parent = el.parentElement;
    while (parent && style(parent).display === "contents") parent = parent.parentElement;
    if (!parent || style(parent).display.startsWith("inline")) continue;
    if (["auto", "scroll"].includes(style(parent).overflowX)) continue;
    wide.push({
      id: id(el),
      selector: path(el),
      label: named(el),
      box: box(el),
      parent: box(parent),
    });
  }

  const headings = [...document.body.querySelectorAll("h1,h2,h3,h4,h5,h6")]
    .filter(shown)
    .map((el) => ({
      id: id(el),
      level: Number(el.tagName[1]),
      size: Number.parseFloat(style(el).fontSize),
      scope: id(el.closest("dialog,[role=dialog],[role=alertdialog]") ?? document.body),
      selector: path(el),
      label: named(el),
      box: box(el),
    }));

  const shifts = window.lymiShifts ?? [];
  window.lymiShifts = [];
  return { viewport: { w: innerWidth, h: innerHeight }, rows, icons, wide, headings, shifts };
}
