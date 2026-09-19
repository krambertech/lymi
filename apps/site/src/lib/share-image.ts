import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import onest from "../fonts/onest.ttf?inline";

/** The font travels inside the bundle as a data URL, so a cold Worker renders without a fetch. */
function decodeDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
}

let ready: Promise<Uint8Array> | undefined;

/** Rasterises an SVG to PNG on the Worker. The first call per isolate compiles the renderer. */
export async function renderPng(svg: string): Promise<Uint8Array> {
  ready ??= initWasm(resvgWasm)
    .then(() => decodeDataUrl(onest))
    .catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  const font = await ready;
  const resvg = new Resvg(svg, {
    font: { fontBuffers: [font], defaultFontFamily: "Onest" },
    fitTo: { mode: "original" },
  });
  try {
    return resvg.render().asPng();
  } finally {
    resvg.free();
  }
}
