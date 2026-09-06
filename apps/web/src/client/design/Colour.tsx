import { useLayoutEffect, useRef, useState } from "react";
import { contrast } from "./contrast";
import { Section, Sub } from "./Frame";

const TOKENS: { name: string; role: string; text?: string; decorative?: boolean }[] = [
  { name: "canvas", role: "The room. Page background." },
  { name: "rail", role: "The navigation rail: one surface off the room, so chrome reads apart." },
  { name: "plate", role: "A thing in the room: cards, rows, inputs, the active nav item." },
  { name: "plate-2", role: "A well inside a plate: segmented tracks, chips, kbd." },
  { name: "hover", role: "Plate on hover." },
  { name: "edge", role: "The one hairline. Alpha, so it sits on any plate." },
  { name: "edge-2", role: "Stronger hairline: focused or hovered edges, dividers that must read." },
  { name: "text", role: "Words. Also the metal of the lantern in the light room.", text: "canvas" },
  { name: "text-2", role: "Secondary words: meanings, examples, nav.", text: "canvas" },
  { name: "muted", role: "Labels, counts, hints. Still 4.5:1 on canvas.", text: "canvas" },
  {
    name: "faint",
    role: "Decorative only: dashes, unlit day letters. Never for words.",
    text: "canvas",
  },
  { name: "amber", role: "The flame and the one thing to press.", text: "amber-ink" },
  { name: "amber-text", role: "Amber as text: due counts.", text: "canvas" },
  { name: "amber-soft", role: "Amber tint: New chip, glass, selection." },
  { name: "good", role: "Known. Status only, always with a label.", text: "canvas" },
  {
    name: "danger",
    role: "Destructive actions and errors. Always with an icon or a word.",
    text: "canvas",
  },
];

function Swatch({
  name,
  textOn,
  decorative,
}: {
  name: string;
  textOn?: string | undefined;
  decorative?: boolean | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!textOn) return;
    // Text tokens are measured against canvas; on-colour tokens against themselves.
    const fg = textOn === "canvas" ? `var(--${name})` : `var(--${textOn})`;
    const bg = textOn === "canvas" ? "var(--canvas)" : `var(--${name})`;
    setRatio(contrast(fg, bg, ref.current));
  }, [name, textOn]);
  return (
    <div ref={ref} className="grid gap-1.5">
      <div
        className="edge flex h-14 items-end rounded-sm px-2 pb-1.5 text-2xs font-semibold tabular-nums"
        style={{
          background: textOn === "canvas" ? "var(--canvas)" : `var(--${name})`,
          color: textOn === "canvas" ? `var(--${name})` : textOn ? `var(--${textOn})` : undefined,
        }}
      >
        {ratio && (
          <span title="Contrast ratio">
            {ratio.toFixed(1)}:1
            {decorative
              ? " · decorative"
              : ratio >= 4.5
                ? ""
                : ratio >= 3
                  ? " · large only"
                  : " · fails"}
          </span>
        )}
      </div>
      <code className="text-2xs text-muted">--{name}</code>
    </div>
  );
}

export function Colour() {
  return (
    <Section
      id="colour"
      title="Colour"
      lede="Two rooms, one flame. Neutrals are warm and nearly grey. Amber is the only saturated colour and appears at most twice per screen. Surfaces are flat: no gradients, no drop shadows, one hairline edge. Ratios are measured live against this page."
    >
      <div className="grid gap-3 @3xl:grid-cols-2">
        {(["light", "dark"] as const).map((t) => (
          <div
            key={t}
            data-theme={t}
            className="@container edge rounded-lg bg-canvas p-5 text-text"
          >
            <h3 className="mb-4 text-sm font-medium">
              {t === "light" ? "Light room" : "Dark room"}
            </h3>
            <div className="grid grid-cols-3 gap-3 @xl:grid-cols-5">
              {TOKENS.map((tk) => (
                <Swatch key={tk.name} name={tk.name} textOn={tk.text} decorative={tk.decorative} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Sub title="Roles">
        <dl className="grid gap-x-8 gap-y-2 text-base @3xl:grid-cols-2">
          {TOKENS.map((t) => (
            <div key={t.name} className="flex gap-3 border-b border-edge py-2">
              <dt className="w-28 shrink-0">
                <code className="text-sm text-text-2">--{t.name}</code>
              </dt>
              <dd className="text-text-2">{t.role}</dd>
            </div>
          ))}
        </dl>
      </Sub>

      <Sub title="Rules">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Amber twice per screen at most: the flame and the primary action. A due count in amber-text is the third allowed use.",
            "Status is never colour alone. New, Learning and Known carry a label and a dot.",
            "Depth is one edge. Cards, inputs and rows get --edge; on hover or focus it becomes --edge-2. Nothing casts a shadow.",
            "No gradient on any surface. The app icon is the one exception. If something needs to feel lit, it is the lantern, and it uses --glow.",
            "Text on canvas meets 4.5:1 in both rooms, including --muted. --faint is decorative and never carries words.",
            "Dark is not inverted light. The plate is lighter than the canvas in both rooms, so a card always comes forward.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
    </Section>
  );
}
