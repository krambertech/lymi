/** WCAG contrast from two CSS colours, resolved through the browser. */
export function contrast(fg: string, bg: string, el: HTMLElement | null): number | null {
  if (!el) return null;
  const a = rgb(fg, el);
  const b = rgb(bg, el);
  if (!a || !b) return null;
  const f = a[3] < 1 ? blend(a, b) : a;
  const l1 = lum(f);
  const l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

type RGBA = [number, number, number, number];

/** Resolve any CSS colour, including var() and oklch(), to 0–255 sRGB. */
function rgb(color: string, el: HTMLElement): RGBA | null {
  const probe = document.createElement("span");
  probe.style.color = color;
  probe.style.display = "none";
  el.appendChild(probe);
  const c = getComputedStyle(probe).color;
  el.removeChild(probe);
  const ok = c.match(/^oklch\(([\d.]+%?) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+%?))?\)$/);
  if (ok) {
    const L = ok[1]?.endsWith("%") ? Number.parseFloat(ok[1]) / 100 : Number(ok[1]);
    const alpha = ok[4]
      ? ok[4].endsWith("%")
        ? Number.parseFloat(ok[4]) / 100
        : Number(ok[4])
      : 1;
    return [...oklchToSrgb(L, Number(ok[2]), Number(ok[3])), alpha] as RGBA;
  }
  const srgb = c.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (srgb)
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
      srgb[4] ? Number(srgb[4]) : 1,
    ];
  const m = c.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 1];
  return null;
}

function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const gamma = (x: number) => {
    const v = Math.max(0, Math.min(1, x));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };
  return [gamma(r) * 255, gamma(g) * 255, gamma(bl) * 255];
}

function blend(f: RGBA, b: RGBA): RGBA {
  const a = f[3];
  return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1];
}

function lum([r, g, b]: RGBA) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
