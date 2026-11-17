// Candidates B and C: RaTeX draws natively from Rust; a WebView runs KaTeX itself.
import { memo, useState } from "react";
import { Text, View } from "react-native";
import { RaTeXView } from "ratex-react-native";
import { WebView } from "react-native-webview";

type Props = {
  tex: string;
  display?: boolean;
  fontSize: number;
  color: string;
  mutedColor: string;
  onReady?: () => void;
};

export const RaTeXFormula = memo(function RaTeXFormula({
  tex,
  display = false,
  fontSize,
  color,
  mutedColor,
  onReady,
}: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Text style={{ color: mutedColor, fontSize }}>{tex}</Text>;
  return (
    <RaTeXView
      latex={tex}
      displayMode={display}
      fontSize={fontSize}
      color={color}
      style={display ? { alignSelf: "center" } : { alignSelf: "baseline" }}
      onError={() => {
        setFailed(true);
        onReady?.();
      }}
      onContentSizeChange={() => onReady?.()}
    />
  );
});

const html = (tex: string, display: boolean, fontSize: number, color: string, muted: string) => `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js"></script>
<style>html,body{margin:0;padding:0;background:transparent;color:${color};font-size:${fontSize}px}
#m{display:inline-block}.err{color:${muted};font-family:-apple-system}</style></head>
<body><span id="m"></span><script>
const el=document.getElementById('m');
try{katex.render(${JSON.stringify(tex)},el,{displayMode:${display},throwOnError:true})}
catch(e){el.className='err';el.textContent=${JSON.stringify(tex)}}
document.fonts.ready.then(()=>{const r=el.getBoundingClientRect();
window.ReactNativeWebView.postMessage(JSON.stringify({w:Math.ceil(r.width),h:Math.ceil(r.height)}))});
</script></body></html>`;

export const WebViewFormula = memo(function WebViewFormula({
  tex,
  display = false,
  fontSize,
  color,
  mutedColor,
  onReady,
}: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View
      style={{
        width: display ? "100%" : (size?.w ?? 1),
        height: size?.h ?? fontSize * 1.4,
      }}
    >
      <WebView
        originWhitelist={["*"]}
        source={{ html: html(tex, display, fontSize, color, mutedColor) }}
        style={{ backgroundColor: "transparent" }}
        scrollEnabled={false}
        onMessage={(e) => {
          setSize(JSON.parse(e.nativeEvent.data));
          onReady?.();
        }}
      />
    </View>
  );
});
