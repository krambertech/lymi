import { useState } from "react";
import { Button } from "../components/button";
import { Lantern } from "../components/lantern";
import { toast } from "../components/ui/toast";
import { FLAME_MOTION } from "../lib/flame";
import { DocLink } from "./doc-link";
import { Doc, Specimen, Sub } from "./frame";

const ms = (s: { visualDuration: number }) => `${Math.round(s.visualDuration * 1000)} ms`;

const TIMINGS: [string, string, string][] = [
  [
    "Press",
    "scale 0.97, 150 ms ease-out",
    "Buttons, segments, the pill nav. Deck cards 0.98, grades 0.96, direction rows 0.99; menu and rail rows do not scale.",
  ],
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
  [
    "Reveal",
    "word 340 ms, rule 360 ms, lines 10 px out of 4 px blur in 260 ms, 50 ms apart",
    "The word glides up, the rule draws from the start edge, and the meaning, example and sources rise under it.",
  ],
  [
    "Grades",
    "strip opens 340 ms; each 10 px rise in 220 ms, 35 ms apart, 80 ms in",
    "The strip only exists after reveal, so the card shrinks as the word glides.",
  ],
  [
    "Segmented",
    "plate springs, about 340 ms, bounce 0.16",
    "The chosen plate moves to the new option. A keyboard change jumps.",
  ],
  [
    "Choices",
    "springs, about 320 ms, bounce 0.3; out in 100 ms",
    "A checkbox gives as its tick draws, a radio dot swells and settles, a held switch thumb stretches and then springs across.",
  ],
  [
    "Tooltip",
    "500 ms wait, in 120 ms, out 80 ms",
    "Grows from the side nearest its control. The next one along a row opens at once.",
  ],
  [
    "Feed",
    `breath in ${ms(FLAME_MOTION.breathIn)}, out ${ms(FLAME_MOTION.breathOut)}, springs`,
    "Every accepted review, whatever the grade. Reviews close together flow into one breath.",
  ],
  [
    "Rise",
    `spring ${ms(FLAME_MOTION.rise)} to full height`,
    "The daily goal reached. Once a day, and it stays.",
  ],
  [
    "Toast",
    "500 ms on an ease-out-expo curve, in and out",
    "shadcn's default: older toasts step back 12 px and 10% smaller, and the stack spreads on hover.",
  ],
  [
    "Drawer and dialog",
    "drawer: in 450 ms, out up to 320 ms by flick. Dialog: in 200 ms, out 140 ms",
    "A drawer on a touch device, a centred dialog on a desktop.",
  ],
  ["Theme switch", "none", "Transitions are suspended for one frame so the room swaps at once."],
];

export function Motion() {
  const [card, setCard] = useState(0);
  return (
    <Doc
      title="Motion"
      lede="Motion conveys state and nothing else. Most transitions are 150 to 250 ms with a strong ease-out. Keyboard-initiated actions do not animate, except the flame, which a review feeds whether it came from a key or a tap. The flame moves on its own because a flame does; it is the one piece of ambient motion, and it holds still under reduced motion."
    >
      <Sub
        title="The flame"
        note="The one piece of ambient motion, and the one that carries the most meaning: it feeds on every review, rises at the daily goal, and catches or goes out with the streak."
      >
        <DocLink
          to={{ kind: "page", page: "lantern" }}
          className="edge flex items-center gap-4 rounded-lg bg-plate px-5 py-4 transition-[box-shadow,background-color] duration-150 hoverable:hover:edge-2 hoverable:hover:bg-hover"
        >
          <Lantern className="size-14" progress={0.6} flicker glow />
          <span className="grid gap-0.5">
            <span className="text-base font-medium">Lantern</span>
            <span className="text-sm text-muted">
              Every state and movement, with a day to play through.
            </span>
          </span>
        </DocLink>
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
        note="A card arriving, and the real toast at the foot of the window. Press a few times to stack them, then point at the stack to open it."
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
          <div className="grid content-end gap-3">
            <Button
              size="sm"
              onClick={() => {
                const id = toast.add({
                  title: "Archived “sbrigarsi”",
                  actionProps: { children: "Undo", onClick: () => toast.close(id) },
                });
              }}
            >
              Show toast
            </Button>
          </div>
        </Specimen>
      </Sub>

      <Sub
        title="Reduced motion"
        note="Every animation has a quieter twin. With prefers-reduced-motion: reduce, the flame holds still and jumps to its new size, the card and toast crossfade with no travel, the skeleton stops shimmering, and the glow still appears, because a glow is a state, not a movement."
      >
        <p className="text-base text-text-2">
          Toggle it in your OS to see this page change. Nothing is gated on the animation: every
          reveal enhances an already visible default.
        </p>
      </Sub>
    </Doc>
  );
}
