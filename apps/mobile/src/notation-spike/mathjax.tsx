// Candidate A: MathJax 3 converts TeX to an SVG string in JavaScript; react-native-svg draws it.
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import "mathjax-full/js/input/tex/ams/AmsConfiguration.js";
import "mathjax-full/js/input/tex/base/BaseConfiguration.js";
import "mathjax-full/js/input/tex/mhchem/MhchemConfiguration.js";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { memo } from "react";
import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

const setupStart = performance.now();
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams", "mhchem"] }),
  OutputJax: new SVG({ fontCache: "none" }),
});
// The first conversion pays for loading the font tables, so it is timed apart.
doc.convert("x", { display: false });
export const setupMs = performance.now() - setupStart;

type Drawn = { xml: string; width: number; height: number; shift: number; error: boolean };
const cache = new Map<string, Drawn>();
export let conversions = 0;
export let conversionMs = 0;

// MathJax sizes in ex; one ex is about half the font size.
const EX = 0.5;

function draw(tex: string, display: boolean, fontSize: number): Drawn {
  const key = `${display ? "D" : "I"}${tex}`;
  let drawn = cache.get(key);
  if (!drawn) {
    const start = performance.now();
    const node = doc.convert(tex, { display });
    const svg = adaptor.firstChild(node) as never;
    const xml = adaptor.outerHTML(svg);
    const ex = (name: string) => Number.parseFloat(String(adaptor.getAttribute(svg, name) ?? "0"));
    const style = String(adaptor.getAttribute(svg, "style") ?? "");
    const align = Number.parseFloat(/vertical-align:\s*(-?[\d.]+)ex/.exec(style)?.[1] ?? "0");
    drawn = {
      xml: xml.replace(/currentColor/g, "COLOR"),
      width: ex("width"),
      height: ex("height"),
      shift: align,
      error: xml.includes("data-mjx-error") || xml.includes("merror"),
    };
    cache.set(key, drawn);
    conversions++;
    conversionMs += performance.now() - start;
  }
  void fontSize;
  return drawn;
}

export const MathJaxFormula = memo(function MathJaxFormula({
  tex,
  display = false,
  fontSize,
  color,
  mutedColor,
}: {
  tex: string;
  display?: boolean;
  fontSize: number;
  color: string;
  mutedColor: string;
}) {
  const d = draw(tex, display, fontSize);
  if (d.error) return <Text style={{ color: mutedColor, fontSize }}>{tex}</Text>;
  const scale = fontSize * EX;
  const svg = (
    <SvgXml
      xml={d.xml.replace(/COLOR/g, color)}
      width={d.width * scale}
      height={d.height * scale}
    />
  );
  if (display) return <View style={{ alignItems: "center" }}>{svg}</View>;
  // An inline view sits on the baseline; MathJax's vertical-align says how far below it reaches.
  return <View style={{ marginBottom: d.shift * scale }}>{svg}</View>;
});
