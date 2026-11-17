// Issue #1187: compare phone renderers on one formula set and a 50-card list. Not for main.
import { palette } from "@lymi/design";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Settings, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InlineTeX } from "ratex-react-native";
import { CARDS, FORMULAS } from "./formulas";
import * as mj from "./mathjax";
import { RaTeXFormula, WebViewFormula } from "./others";

type Renderer = "plain" | "mathjax" | "ratex" | "webview";
type Mode = "set" | "list";

type FormulaProps = {
  renderer: Renderer;
  tex: string;
  display?: boolean;
  fontSize: number;
  color: string;
  mutedColor: string;
  onReady?: () => void;
};

function Formula(props: FormulaProps) {
  if (props.renderer === "plain") {
    return <Text style={{ color: props.color, fontSize: props.fontSize }}>{props.tex}</Text>;
  }
  if (props.renderer === "mathjax") return <mj.MathJaxFormula {...props} />;
  if (props.renderer === "ratex") return <RaTeXFormula {...props} />;
  return <WebViewFormula {...props} />;
}

/** A sentence holding one formula, laid out the way each renderer is meant to do it. */
function Sentence(props: FormulaProps & { before: string; after: string }) {
  const { renderer, before, tex, after, fontSize, color } = props;
  if (renderer === "plain") return <Text style={{ color, fontSize }}>{`${before}${tex}${after}`}</Text>;
  if (renderer === "ratex") {
    // A native text view: formulas wrap with the words, but nested bold, italics and links cannot.
    return (
      <InlineTeX content={`${before}$${tex}$${after}`} fontSize={fontSize} color={color} textStyle={{ color, fontSize }} />
    );
  }
  if (renderer === "webview") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
        <Text style={{ color, fontSize }}>{before}</Text>
        <Formula {...props} />
        <Text style={{ color, fontSize }}>{after}</Text>
      </View>
    );
  }
  return (
    <Text style={{ color, fontSize }}>
      {before}
      <Formula {...props} />
      {after}
    </Text>
  );
}

export function NotationSpike() {
  const room = useColorScheme() === "dark" ? "dark" : "light";
  const p = palette[room];
  // `simctl launch <udid> app.lymi -spikeR ratex -spikeM list` picks them without a tap.
  const [renderer, setRenderer] = useState<Renderer>(() => Settings.get("spikeR") ?? "mathjax");
  const [mode, setMode] = useState<Mode>(() => Settings.get("spikeM") ?? "set");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState("");
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const ink = p.ink;
  const muted = p["ink-muted"];

  const chip = (label: string, on: boolean, press: () => void) => (
    <Pressable
      key={label}
      onPress={press}
      style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: on ? p.ink : p.plate }}
    >
      <Text style={{ color: on ? p.canvas : ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.canvas }}>
      <View style={{ flexDirection: "row", gap: 6, padding: 8, flexWrap: "wrap" }}>
        {(["plain", "mathjax", "ratex", "webview"] as const).map((r) =>
          chip(r, r === renderer, () => {
            setRenderer(r);
            setRun((n) => n + 1);
            setResult("");
          }),
        )}
        {chip(mode === "set" ? "→ list" : "→ set", false, () => {
          setMode(mode === "set" ? "list" : "set");
          setRun((n) => n + 1);
          setResult("");
        })}
      </View>
      {result ? <Text style={{ color: ink, fontSize: 12, paddingHorizontal: 8 }}>{result}</Text> : null}
      {mode === "set" ? (
        <ScrollView
          key={`set${run}`}
          contentOffset={{ x: 0, y: Number(Settings.get("spikeY") ?? 0) }}
          contentContainerStyle={{ padding: 16, gap: 14 }}
        >
          {FORMULAS.filter((f) => !Settings.get("spikeOnly") || Settings.get("spikeOnly").includes(f.id)).map((f) => (
            <View key={f.id} style={{ gap: 4 }}>
              <Text style={{ color: muted, fontSize: 12 }}>{f.id}</Text>
              {f.display ? (
                <ScrollView horizontal>
                  <Formula renderer={renderer} tex={f.tex} display fontSize={17} color={ink} mutedColor={muted} />
                </ScrollView>
              ) : (
                <Sentence
                  renderer={renderer}
                  before="Inline "
                  tex={f.tex}
                  after=" in a sentence."
                  fontSize={17}
                  color={ink}
                  mutedColor={muted}
                />
              )}
              {!f.display && f.id !== "malformed" && (
                <View style={{ alignItems: "flex-start" }}>
                  <Formula renderer={renderer} tex={f.tex} fontSize={34} color={ink} mutedColor={muted} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <List
          key={`list${run}`}
          renderer={renderer}
          ink={ink}
          muted={muted}
          plate={p.plate}
          onResult={(r) => {
            setResult(r);
            console.error(`SPIKE ${r}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function List({
  renderer,
  ink,
  muted,
  plate,
  onResult,
}: {
  renderer: Renderer;
  ink: string;
  muted: string;
  plate: string;
  onResult: (r: string) => void;
}) {
  const start = useRef(performance.now());
  // InlineTeX reports nothing, so RaTeX sentences count as ready at the first frame.
  const ready = useRef(renderer === "ratex" ? CARDS.length : 0);
  const done = useRef(false);
  const scroller = useRef<ScrollView>(null);
  const height = useRef(0);
  const expected = CARDS.length * 2;
  const mjBefore = useRef({ n: mj.conversions, ms: mj.conversionMs });

  const finish = (how: string) => {
    if (done.current) return;
    done.current = true;
    const shown = performance.now() - start.current;
    const conv = `${mj.conversions - mjBefore.current.n} conversions in ${(mj.conversionMs - mjBefore.current.ms).toFixed(0)} ms; `;
    // Scroll top to bottom in 3 s from JavaScript and count frames that took over 25 ms.
    let last = performance.now();
    let slow = 0;
    let frames = 0;
    const t0 = last;
    const step = () => {
      const now = performance.now();
      frames++;
      if (now - last > 25) slow++;
      last = now;
      const f = Math.min(1, (now - t0) / 3000);
      scroller.current?.scrollTo({ y: f * height.current, animated: false });
      if (f < 1) requestAnimationFrame(step);
      else {
        onResult(
          `${renderer}: 50 cards shown in ${shown.toFixed(0)} ms (${how}); ${renderer === "mathjax" ? `setup ${mj.setupMs.toFixed(0)} ms; ${conv}` : ""}scroll ${slow}/${frames} frames over 25 ms`,
        );
      }
    };
    setTimeout(() => requestAnimationFrame(step), 300);
  };

  const onReady = () => {
    ready.current++;
    if (ready.current >= expected) finish("all formulas reported");
  };

  useEffect(() => {
    // MathJax and plain text draw synchronously, so the first frame after mount has everything.
    if (renderer === "mathjax" || renderer === "plain") requestAnimationFrame(() => finish("first frame"));
    const t = setTimeout(() => finish(`timed out at ${ready.current}/${expected}`), 20000);
    return () => clearTimeout(t);
    // biome-ignore lint/correctness/useExhaustiveDependencies: measured once per mount
  }, []);

  return (
    <ScrollView
      ref={scroller}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      onContentSizeChange={(_, h) => {
        height.current = h;
      }}
    >
      {CARDS.map((c) => (
        <View key={c.id} style={{ backgroundColor: plate, borderRadius: 12, padding: 14, gap: 6 }}>
          <View style={{ alignItems: "flex-start" }}>
            <Formula renderer={renderer} tex={c.term} fontSize={22} color={ink} mutedColor={muted} onReady={onReady} />
          </View>
          <Sentence
            renderer={renderer}
            before={c.before}
            tex={c.meaningTex}
            after={c.after}
            fontSize={15}
            color={ink}
            mutedColor={muted}
            onReady={onReady}
          />
        </View>
      ))}
    </ScrollView>
  );
}
