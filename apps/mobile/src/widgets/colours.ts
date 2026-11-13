import { palette } from "@lymi/design";

/** The colours a widget draws with, all opaque: SwiftUI reads an eight-digit hex as alpha first. */
export interface WidgetRoom {
  ink: string;
  muted: string;
  canvas: string;
  /** The room's pool over its canvas, where the lantern stands. */
  pool: string;
  /** The seven lights' steps, from the empty glass to full. */
  lights: string[];
}

export type WidgetColours = Record<"light" | "dark", WidgetRoom>;

/** `top` laid over the opaque `bottom`, as one opaque hex. */
function over(top: string, bottom: string) {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const alpha = top.length === 9 ? channel(top, 3) / 255 : 1;
  const mixed = [0, 1, 2].map((i) =>
    Math.round(channel(top, i) * alpha + channel(bottom, i) * (1 - alpha)),
  );
  return `#${mixed.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function room(p: (typeof palette)["light" | "dark"]): WidgetRoom {
  return {
    ink: p.ink,
    muted: p["ink-muted"],
    canvas: p.canvas,
    pool: over(p["lantern-pool"], p.canvas),
    lights: [p["plate-nested"], p["lit-low"], p["lit-high"], p.amber],
  };
}

/**
 * A widget runs in its own runtime and cannot import, so the app sends the colours with each
 * snapshot; the widget falls back to the system's own styles before the first one arrives.
 */
export const WIDGET_COLOURS: WidgetColours = {
  light: room(palette.light),
  dark: room(palette.dark),
};
