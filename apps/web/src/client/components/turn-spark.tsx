import {
  END_OF_REVIEW as AT,
  EMBER_DRIFT,
  FLECK_HOT_MS,
  fleckAt,
  lightBurst,
  type Point,
  SPARK_FLIGHT,
  SPARK_MS,
  SPARK_TRAIL,
  sparkAt,
} from "@lymi/design";
import { cubicBezier } from "motion/react";
import { type RefObject, useEffect, useRef } from "react";

const BURST = lightBurst(10);
const flight = cubicBezier(...SPARK_FLIGHT);
const drift = cubicBezier(...EMBER_DRIFT);
const TONES = ["--light-1", "--light-2", "--flame-core"] as const;
/** The canvas reaches this far past the column, so a fleck thrown sideways is never cut off. */
const BLEED = 64;

interface Props {
  /** The lantern's place, measured untransformed, so the spark leaves from where the lantern lands. */
  lantern: RefObject<HTMLElement | null>;
  /** The box holding today's light (`data-today-light`) and the run's flame (`data-run-flame`). */
  room: RefObject<HTMLElement | null>;
}

/**
 * When the day has just turned, a spark leaves the lantern's flame and drops into today's light,
 * which throws a few flecks as it fills; a smaller spark hops on to the run's flame, which throws
 * three of its own as it catches. It plays on the end's clock from mount, and the parent removes it
 * when the sequence is finished early or motion is reduced. motion.md "The end of a review".
 */
export function TurnSpark({ lantern, room }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const colour = (token: string) => {
      el.style.color = `var(${token})`;
      return getComputedStyle(el).color;
    };
    const ink = {
      amber: colour("--amber"),
      core: colour("--flame-core"),
      glow: colour("--glow"),
      tones: TONES.map(colour),
    };
    const start = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const t = now - start;
      const box = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (el.width !== Math.round(box.width * dpr)) el.width = Math.round(box.width * dpr);
      if (el.height !== Math.round(box.height * dpr)) el.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      const at = (node: Element | null | undefined, y: number): Point | undefined => {
        const r = node?.getBoundingClientRect();
        return r
          ? { x: r.left + r.width / 2 - box.left, y: r.top + r.height * y - box.top }
          : undefined;
      };
      const vent = at(lantern.current, 0.52);
      const today = at(room.current?.querySelector("[data-today-light]"), 0);
      const run = at(room.current?.querySelector("[data-run-flame]"), 0.35);
      if (!vent || !today || !run) return;

      const dot = (p: Point, r: number, fill: string, glow: number, alpha: number) => {
        ctx.globalAlpha = alpha;
        ctx.shadowColor = ink.glow;
        ctx.shadowBlur = glow;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      const leg = (
        from: Point,
        to: Point,
        leaves: number,
        ms: number,
        bend: number,
        size: number,
      ) => {
        for (let k = 0; k < SPARK_TRAIL.dots; k++) {
          const u = (t - leaves - k * SPARK_TRAIL.step) / ms;
          if (u <= 0 || u >= 1) continue;
          const fade = 1 - k / SPARK_TRAIL.dots;
          const p = sparkAt(flight(u), from, to, bend);
          dot(
            p,
            size * (1 - k / 9),
            k === 0 ? ink.core : ink.amber,
            k === 0 ? 12 : 4,
            k === 0 ? 1 : fade * 0.55,
          );
        }
      };
      leg(vent, today, AT.spark, SPARK_MS.land, 90, 3.4);
      leg({ x: today.x, y: today.y - 2 }, run, AT.hop, SPARK_MS.hop, -30, 2.4);

      for (const f of BURST) {
        const ms = t - AT.land;
        const { x, y, opacity, turn } = fleckAt(f, ms);
        if (opacity <= 0) continue;
        const hot = Math.max(0, 1 - (ms - f.at) / FLECK_HOT_MS);
        ctx.save();
        ctx.translate(today.x + x, today.y + y);
        ctx.rotate(turn * 0.6);
        ctx.globalAlpha = opacity;
        ctx.shadowColor = ink.glow;
        ctx.shadowBlur = 10 * hot;
        ctx.fillStyle = hot > 0.5 ? ink.core : (ink.tones[f.tone - 1] ?? ink.amber);
        // A fleck turning edge-on narrows, which is what makes it read as tumbling.
        ctx.scale(Math.max(0.18, Math.abs(Math.cos(turn))), 1);
        ctx.beginPath();
        ctx.roundRect(-f.w / 2, -f.h / 2, f.w, f.h, 1);
        ctx.fill();
        ctx.restore();
      }

      for (let i = 0; i < 3; i++) {
        const u = (t - AT.tick - 40 - i * 70) / 620;
        if (u <= 0 || u >= 1) continue;
        const q = drift(u);
        dot(
          { x: run.x + (i - 1) * 7 * q, y: run.y - 8 - 22 * q },
          1.6 * (1 - 0.5 * q),
          ink.core,
          6,
          1 - u,
        );
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (t < AT.tick + 1300) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [lantern, room]);

  return (
    <canvas
      ref={canvas}
      // A canvas keeps its default 300 × 150 under insets alone, so it is sized outright.
      className="pointer-events-none absolute top-0 z-10 h-full"
      style={{ insetInlineStart: -BLEED, width: `calc(100% + ${BLEED * 2}px)` }}
    />
  );
}
