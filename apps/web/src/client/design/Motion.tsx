import { useState } from "react";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { Segmented } from "../components/Segmented";
import { Toast } from "../components/Toast";
import { Doc, Pair, Specimen, Sub } from "./Frame";

const TIMINGS: [string, string, string][] = [
  ["Press", "scale 0.97, 150 ms ease-out", "Every button and row. Confirms the tap landed."],
  [
    "Hover",
    "background and edge, 150 ms",
    "Pointer devices only. Never a lift, never a colour flip. In a menu or a list of options it is one fill that slides to the nearest row, so it never blinks off in the gaps. Keyboard takes it away.",
  ],
  [
    "Card arrives",
    "6 px rise + fade, 200 ms ease-out",
    "Each new card in review. Keyed, so grading restarts it.",
  ],
  [
    "Menu opens",
    "scale 0.94 to 1 + fade, 140 ms ease-out",
    "From the corner nearest the button that opened it. Never a slide.",
  ],
  ["Reveal", "fade + 4 px, 200 ms ease-out", "The meaning unfolding under the rule."],
  [
    "Segmented",
    "chip slides, 200 ms ease-out",
    "The chosen plate moves to the new option. A keyboard change jumps.",
  ],
  [
    "Tooltip",
    "500 ms wait, in 120 ms, out 80 ms",
    "Grows from the side nearest its control. The next one along a row opens at once.",
  ],
  [
    "Flare",
    "flame scale 1.2×1.35, 320 ms, then back",
    "After Good or Easy. The lantern in the header only.",
  ],
  ["Lit up", "flame 1.15×1.28 in 320 ms, glow to 26 px in 500 ms", "Session done. Stays."],
  [
    "Toast",
    "in 240 ms, out 140 ms, both ease-out",
    "Exit is faster than entry. One toast at a time.",
  ],
  [
    "Sheet",
    "drawer: vaul curve. Modal: in 200 ms, out 140 ms",
    "A drawer on the phone, a centred modal on a desktop.",
  ],
  ["Theme switch", "none", "Transitions are suspended for one frame so the room swaps at once."],
];

type State = "idle" | "flicker" | "flare" | "lit" | "catch" | "carry" | "unlit";

export function Motion() {
  const [state, setState] = useState<State>("flicker");
  const [toast, setToast] = useState<"off" | "in" | "out">("off");
  const dismiss = () => {
    setToast("out");
    window.setTimeout(() => setToast("off"), 150);
  };
  const [card, setCard] = useState(0);
  return (
    <Doc
      title="Motion"
      lede="Motion conveys state and nothing else. Most transitions are 150 to 250 ms with a strong ease-out. Keyboard-initiated actions do not animate. The flame moves on its own because a flame does; it is the one piece of ambient motion, and it stops under reduced motion."
    >
      <Sub
        title="Lantern states"
        note="Flicker is a 2.6 s loop: the flame scales, the bright core beats out of phase with it, and the halo breathes with both. Flare is a one-shot after a good answer. Lit up is the end of a session and stays. Catch is the wick taking, for unlit to lit. Carried swings the body from the bail. Unlit has no flame and no glow."
      >
        <Pair>
          {() => (
            <div className="grid justify-items-center gap-6 py-4">
              <Lantern
                className="size-40"
                variant={state === "unlit" ? "unlit" : "lit"}
                flicker={
                  state === "flicker" || state === "flare" || state === "carry" || state === "catch"
                }
                glow={state !== "unlit"}
                flare={state === "flare"}
                litUp={state === "lit"}
                catchLight={state === "catch"}
                carry={state === "carry"}
                key={state}
              />
              <Segmented
                size="sm"
                label="Lantern state"
                value={state}
                onChange={(v) => {
                  setState(v);
                  if (v === "flare") setTimeout(() => setState("flicker"), 380);
                }}
                options={[
                  { value: "idle", label: "Still" },
                  { value: "flicker", label: "Flicker" },
                  { value: "flare", label: "Flare" },
                  { value: "lit", label: "Lit up" },
                  { value: "catch", label: "Catch" },
                  { value: "carry", label: "Carried" },
                  { value: "unlit", label: "Unlit" },
                ]}
              />
            </div>
          )}
        </Pair>
      </Sub>

      <Sub title="Timings">
        <div className="edge overflow-hidden rounded-lg bg-plate">
          {TIMINGS.map(([what, how, where]) => (
            <div
              key={what}
              className="grid gap-1 border-b border-edge px-5 py-3 text-base last:border-b-0 @3xl:grid-cols-[140px_260px_1fr] @3xl:gap-4"
            >
              <span className="font-medium">{what}</span>
              <span className="text-text-2 tabular-nums">{how}</span>
              <span className="text-sm text-muted">{where}</span>
            </div>
          ))}
        </div>
      </Sub>

      <Sub
        title="Try it"
        note="A card arriving, and a toast. The toast pauses its timer while the tab is hidden and leaves faster than it came."
      >
        <Specimen className="gap-6">
          <div className="grid gap-3">
            <div
              key={card}
              className="enter-card edge grid h-28 w-56 place-items-center rounded-xl bg-plate text-md"
            >
              Card {card + 1}
            </div>
            <Button size="sm" onClick={() => setCard((c) => c + 1)}>
              Next card
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="grid h-28 w-72 place-items-center">
              {toast !== "off" ? (
                <Toast
                  inline
                  className={toast === "out" ? "toast-exit" : "toast-enter"}
                  action={{ label: "Undo", onClick: dismiss }}
                >
                  Archived “sbrigarsi”
                </Toast>
              ) : (
                <span className="text-sm text-muted">No toast</span>
              )}
            </div>
            <Button size="sm" onClick={() => (toast === "in" ? dismiss() : setToast("in"))}>
              {toast === "in" ? "Dismiss" : "Show toast"}
            </Button>
          </div>
        </Specimen>
      </Sub>

      <Sub
        title="Reduced motion"
        note="Every animation has a quieter twin. With prefers-reduced-motion: reduce, the flame holds still, the card and toast crossfade with no travel, the skeleton stops shimmering, and the glow still appears, because a glow is a state, not a movement."
      >
        <p className="text-base text-text-2">
          Toggle it in your OS to see this page change. Nothing is gated on the animation: every
          reveal enhances an already visible default.
        </p>
      </Sub>
    </Doc>
  );
}
