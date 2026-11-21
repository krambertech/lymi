import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Check, X } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { playSound, usePlaying } from "../../lib/learn/player";
import { Feedback, type RoundProps, useAutoplay, useNudge } from "./Quiz";
import { Listen, PlayButton } from "./Sound";

/**
 * Illustrated scenes: a cat and something to be in, on, under or next to, drawn flat in the
 * lesson's colours. A lesson names the scene and gives each of its places a sentence; the scene
 * knows where each place is and how the cat gets there.
 */

/** Where the cat stands: its feet, its size, and the layer of the drawing it sits in. */
interface Pose {
  x: number;
  y: number;
  s: number;
  layer: "behind" | "inside" | "front";
  /** Seen through the house's window. */
  window?: boolean;
}

interface Place {
  pose: Pose;
  /**
   * What a tap on the drawing takes for this place, in viewBox units: x, y, width, height. It
   * covers what can be seen of the cat there, and is at least 58 wide and tall: 44 px at 375.
   */
  spot: readonly [number, number, number, number];
  /** A place reached by moving, such as into the house: where the cat sets off from. */
  from?: Pose;
  /** No place in a quiz: hidden from view at rest, or a movement rather than a place. */
  quiz?: false;
}

export type SceneName = "box" | "house" | "table";

const BOX: Record<string, Place> = {
  // Peal, sees and taga sit apart along the box, so a quiz shows each one's outline whole.
  sees: { pose: { x: 252, y: 184, s: 0.82, layer: "inside" }, spot: [245, 96, 58, 58] },
  peal: { pose: { x: 214, y: 120, s: 0.84, layer: "front" }, spot: [186, 30, 58, 88] },
  // Under the box can't be seen until the box tilts, so it has no place in a quiz.
  all: { pose: { x: 236, y: 221, s: 0.5, layer: "behind" }, spot: [228, 196, 60, 44], quiz: false },
  taga: { pose: { x: 163, y: 162, s: 0.82, layer: "behind" }, spot: [126, 68, 58, 60] },
  ees: { pose: { x: 170, y: 252, s: 1.04, layer: "front" }, spot: [126, 140, 86, 116] },
  korval: { pose: { x: 334, y: 222, s: 0.94, layer: "front" }, spot: [304, 140, 64, 96] },
};

const YARD: Pose = { x: 338, y: 236, s: 0.78, layer: "front" };
const DOOR: Pose = { x: 236, y: 224, s: 0.62, layer: "front" };
const WINDOW: Pose = { x: 167, y: 192, s: 0.44, layer: "inside", window: true };
const HOUSE: Record<string, Place> = {
  majja: { pose: WINDOW, from: YARD, spot: [208, 150, 56, 80], quiz: false },
  majas: { pose: WINDOW, spot: [130, 138, 74, 66] },
  majast: { pose: YARD, from: WINDOW, spot: [300, 170, 76, 74], quiz: false },
};

const TABLETOP: Pose = { x: 200, y: 122, s: 0.8, layer: "front" };
const TABLE: Record<string, Place> = {
  lauale: { pose: TABLETOP, from: YARD, spot: [110, 132, 160, 94], quiz: false },
  laual: { pose: TABLETOP, spot: [166, 34, 70, 92] },
  laualt: { pose: YARD, from: TABLETOP, spot: [300, 166, 80, 78], quiz: false },
};

const PLACES: Record<SceneName, Record<string, Place>> = {
  box: BOX,
  house: HOUSE,
  table: TABLE,
};

/** A place's sentence, as the lesson gives it. */
export interface ScenePlace {
  /**
   * The place's id in the scene: sees, peal, all, taga, ees, korval; majja, majas, majast; lauale,
   * laual, laualt.
   */
  id: string;
  /** The word that changes, on its key: peal. */
  word: string;
  /** The word's meaning in the reader's language, under it: on. */
  meaning: string;
  /** The whole sentence; the place word is lit in it. */
  sentence: string;
  /** The sentence in the reader's language. */
  gloss: string;
  src: string;
}

const CAT = `
  <path d="M26 -8 C44 -10 54 -22 50 -38 C48 -46 41 -46 41 -40" fill="none" stroke="var(--ink)" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M-30 0 C-36 -20 -30 -44 -16 -52 L16 -52 C30 -44 36 -20 30 0 Z" fill="var(--scene-cat)" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M-11 0 C-11 -8 -6 -12 -2 -12 M11 0 C11 -8 6 -12 2 -12" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M-21 -82 L-17 -104 L-4 -92 Z M21 -82 L17 -104 L4 -92 Z" fill="var(--scene-cat)" stroke="var(--ink)" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="0" cy="-72" rx="27" ry="23" fill="var(--scene-cat)" stroke="var(--ink)" stroke-width="2.6"/>
  <ellipse cx="-9.5" cy="-74" rx="3.2" ry="4.4" fill="var(--ink)"/>
  <ellipse cx="9.5" cy="-74" rx="3.2" ry="4.4" fill="var(--ink)"/>
  <path d="M-2.6 -66 H2.6 L0 -63 Z" fill="var(--ink)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M-8 -64 L-24 -66 M-8 -61 L-23 -59 M8 -64 L24 -66 M8 -61 L23 -59" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>`;

/** The cat's outline alone, for a place to tap in a quiz. */
const OUTLINE =
  "M-30 0 C-36 -20 -30 -44 -16 -52 L-14 -54 C-26 -62 -28 -78 -21 -86 L-17 -104 L-6 -94 C-2 -95 2 -95 6 -94 L17 -104 L21 -86 C28 -78 26 -62 14 -54 L16 -52 C30 -44 36 -20 30 0 Z";

const T = (p: Pose) => `translate(${p.x}px, ${p.y}px) scale(${p.s})`;
const ABOVE = 100;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const reduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The cat's moves, kept outside React: the cat's group is moved between the drawing's layers as it
 * goes behind, into or in front of the box, so React never renders it.
 */
class Stage {
  at: Pose;
  place: string | null = null;
  lifted = false;
  queue: Promise<void> = Promise.resolve();
  constructor(
    readonly scene: SceneName,
    readonly cat: SVGGElement,
    readonly layers: Record<Pose["layer"], SVGGElement>,
    readonly lid: SVGGElement | null,
    start: string | null,
  ) {
    this.at = start ? (PLACES[scene][start]?.pose ?? YARD) : YARD;
    if (start) this.set(start);
    else this.cat.style.opacity = "0";
  }
  layer(pose: Pose) {
    this.layers[pose.layer].appendChild(this.cat);
  }
  lift(on: boolean) {
    if (!this.lid) return;
    this.lifted = on;
    this.lid.style.transform = on ? "rotate(-20deg)" : "none";
  }
  set(id: string) {
    const place = PLACES[this.scene][id];
    if (!place) return;
    this.place = id;
    this.at = { ...place.pose };
    this.layer(place.pose);
    this.cat.style.transform = T(this.at);
    this.cat.style.opacity = "1";
    this.lift(this.scene === "box" && id === "all");
  }
  async move(to: Pose, ms: number, easing = "cubic-bezier(0.25, 1, 0.5, 1)", mid?: Pose) {
    const frames = mid
      ? [{ transform: T(this.at) }, { transform: T(mid), offset: 0.45 }, { transform: T(to) }]
      : [{ transform: T(this.at) }, { transform: T(to) }];
    const run = this.cat.animate(frames, { duration: ms, easing, fill: "forwards" });
    await run.finished.catch(() => {});
    this.cat.style.transform = T(to);
    run.cancel();
    this.at = { ...to };
  }
  async fade(on: boolean, ms = 160) {
    const run = this.cat.animate([{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], {
      duration: ms,
      easing: "ease-out",
      fill: "forwards",
    });
    await run.finished.catch(() => {});
    this.cat.style.opacity = on ? "1" : "0";
    run.cancel();
  }
  async tilt(on: boolean) {
    if (!this.lid || this.lifted === on) return;
    const run = this.lid.animate(
      [
        { transform: this.lifted ? "rotate(-20deg)" : "rotate(0deg)" },
        { transform: on ? "rotate(-20deg)" : "rotate(0deg)" },
      ],
      { duration: 300, easing: "cubic-bezier(0.25, 1, 0.5, 1)" },
    );
    await run.finished.catch(() => {});
    this.lift(on);
  }
  /** The place asked for last; a move still waiting for an older one is skipped. */
  target: string | null = null;
  /** Moves the cat to a place once the move running now ends. */
  go(id: string): Promise<void> {
    this.target = id;
    this.queue = this.queue
      .then(() => (this.target === id ? this.travel(id) : undefined))
      .catch(() => {});
    return this.queue;
  }
  /** Shows the cat at a place at once, as a quiz does after its answer. */
  show(id: string): Promise<void> {
    this.target = id;
    this.queue = this.queue
      .then(async () => {
        if (this.target !== id) return;
        if (reduced()) return this.set(id);
        await this.fade(false, 100);
        this.set(id);
        await this.fade(true, 200);
      })
      .catch(() => {});
    return this.queue;
  }
  async travel(id: string) {
    const place = PLACES[this.scene][id];
    if (!place) return;
    const hidden = this.cat.style.opacity === "0";
    if (reduced() || hidden) {
      if (!hidden && !reduced()) await this.fade(false, 120);
      this.set(id);
      return;
    }
    if (this.scene === "house") return this.walk(id, place);
    if (this.scene === "table") return this.hop(id, place);
    const from = this.place;
    if (from === id) {
      // Already there: a small hop says so.
      await this.move({ ...this.at, y: this.at.y - 12 }, 150, "ease-out");
      await this.move({ ...place.pose }, 200, "ease-in");
      return;
    }
    const A = this.at;
    const B = place.pose;
    // Out of where it is, until nothing of the box covers it.
    if (from === "all") {
      await this.move({ ...A, x: A.x + 74 }, 300);
      this.layers.front.appendChild(this.cat);
      void this.tilt(false);
    } else if (A.layer !== "front") {
      await this.move({ ...A, y: ABOVE }, 280);
      this.layers.front.appendChild(this.cat);
    }
    // Across to the new place, in an arc.
    let dest = B;
    if (id === "all") {
      void this.tilt(true);
      dest = { ...B, x: B.x + 74 };
    } else if (B.layer !== "front") dest = { ...B, y: ABOVE };
    const mid = {
      ...dest,
      x: (this.at.x + dest.x) / 2,
      y: Math.min(this.at.y, dest.y) - 46,
      s: (this.at.s + dest.s) / 2,
    };
    await this.move(dest, 520, "cubic-bezier(0.33, 0, 0.2, 1)", mid);
    if (id === "all") {
      this.layer(B);
      await this.move(B, 300);
    } else if (B.layer !== "front") {
      this.layer(B);
      await this.move(B, 240, "cubic-bezier(0.5, 0, 0.75, 0)");
    }
    this.place = id;
    this.lift(id === "all");
  }
  /** The house: the cat walks to the door and appears in the window, or the other way. */
  async walk(id: string, place: Place) {
    const end = place.pose;
    const start = place.from;
    // A movement starts on its own side: in the yard to walk in, inside to come out.
    if (start && (start.window === true) !== (this.at.window === true)) {
      await this.fade(false, 140);
      this.jump(start);
      await this.fade(true, 160);
      await wait(160);
    }
    const inside = this.at.window === true;
    if (end.window) {
      if (!inside) {
        if (start) await this.move({ ...DOOR }, 560, "cubic-bezier(0.45, 0, 0.25, 1)");
        await this.fade(false, 140);
        this.set(id);
        this.cat.style.opacity = "0";
        await wait(120);
        await this.fade(true, 200);
      } else {
        // In the window already: a small hop.
        await this.move({ ...this.at, y: this.at.y - 6 }, 140, "ease-out");
        await this.move({ ...end }, 180, "ease-in");
      }
    } else {
      if (inside) {
        await this.fade(false, 140);
        this.jump(DOOR);
        await this.fade(true, 160);
      }
      await this.move({ ...end }, 560, "cubic-bezier(0.45, 0, 0.25, 1)");
    }
    this.place = id;
  }
  /** The table: the cat jumps up onto it from the floor, or down from it, in an arc. */
  async hop(id: string, place: Place) {
    const end = place.pose;
    const start = place.from;
    const at = (pose: Pose) => this.at.x === pose.x && this.at.y === pose.y;
    // A movement starts on its own side: on the floor to jump up, on the table to jump down.
    if (start && !at(start)) {
      await this.fade(false, 140);
      this.jump(start);
      await this.fade(true, 160);
      await wait(160);
    }
    if (at(end)) {
      // There already: a small hop says so.
      await this.move({ ...this.at, y: this.at.y - 12 }, 150, "ease-out");
      await this.move({ ...end }, 200, "ease-in");
    } else {
      const mid = {
        ...end,
        x: (this.at.x + end.x) / 2,
        y: Math.min(this.at.y, end.y) - 52,
        s: (this.at.s + end.s) / 2,
      };
      await this.move({ ...end }, 560, "cubic-bezier(0.33, 0, 0.2, 1)", mid);
    }
    this.place = id;
  }
  /** Puts the cat at a pose without moving it there. */
  jump(pose: Pose) {
    this.at = { ...pose };
    this.layer(pose);
    this.cat.style.transform = T(pose);
  }
}

/** The drawing: the box, the house or the table, with empty layers the cat moves between. */
function Drawing({
  scene,
  layers,
  lid,
  label,
  ghosts = {},
  children,
}: {
  scene: SceneName;
  layers: React.RefObject<Record<Pose["layer"], SVGGElement | null>>;
  lid: React.RefObject<SVGGElement | null>;
  label: string;
  /** Outlines drawn in each layer, under the cat: a quiz's places to tap. */
  ghosts?: Partial<Record<Pose["layer"], ReactNode>>;
  children?: ReactNode;
}) {
  // Two house drawings on a page each need their own window clip.
  const clip = `learn-window-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const at = (name: Pose["layer"]) => (node: SVGGElement | null) => {
    layers.current[name] = node;
  };
  return (
    <svg viewBox="0 0 400 270" role="img" aria-label={label} className="block h-auto w-full">
      {scene === "box" ? (
        <>
          <ellipse cx="212" cy="222" rx="118" ry="13" fill="var(--scene-ground)" />
          <ellipse cx="334" cy="223" rx="34" ry="6" fill="var(--scene-ground)" />
          {ghosts.behind}
          <g ref={at("behind")} />
          <g ref={lid} className="learn-lid">
            <path
              d="M135 130 L153 114 L283 114 L265 130 Z"
              fill="var(--scene-kraft-in)"
              stroke="var(--ink)"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {ghosts.inside}
            <g ref={at("inside")} />
            <path
              d="M265 130 L283 114 L283 204 L265 220 Z"
              fill="var(--scene-kraft-side)"
              stroke="var(--ink)"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <rect
              x="135"
              y="130"
              width="130"
              height="90"
              fill="var(--scene-kraft)"
              stroke="var(--ink)"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <path
              d="M150 196 h22 M150 204 h14"
              stroke="var(--ink)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.35"
            />
          </g>
          {ghosts.front}
          <g ref={at("front")} />
        </>
      ) : scene === "table" ? (
        <>
          <ellipse cx="214" cy="228" rx="160" ry="12" fill="var(--scene-ground)" />
          {/* The table: two back legs, the top seen from a little above, and two front legs. */}
          <path
            d="M138 126 V212 M282 114 V202"
            stroke="var(--ink)"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d="M138 126 V212 M282 114 V202"
            stroke="var(--scene-kraft-in)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {ghosts.behind}
          <g ref={at("behind")} />
          {ghosts.inside}
          <g ref={at("inside")} />
          <path
            d="M110 128 L136 108 L294 108 L268 128 Z"
            fill="var(--scene-kraft)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M268 128 L294 108 L294 120 L268 142 Z"
            fill="var(--scene-kraft-side)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect
            x="110"
            y="128"
            width="158"
            height="14"
            fill="var(--scene-kraft-side)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect
            x="120"
            y="142"
            width="13"
            height="84"
            fill="var(--scene-kraft-side)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect
            x="245"
            y="142"
            width="13"
            height="84"
            fill="var(--scene-kraft-side)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          {ghosts.front}
          <g ref={at("front")} />
        </>
      ) : (
        <>
          <ellipse cx="214" cy="226" rx="150" ry="12" fill="var(--scene-ground)" />
          {ghosts.behind}
          <g ref={at("behind")} />
          {/* The house: walls, roof, chimney, door and a window to see in through. */}
          <rect
            x="250"
            y="44"
            width="20"
            height="40"
            fill="var(--scene-roof)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect
            x="124"
            y="108"
            width="156"
            height="118"
            fill="var(--scene-wall)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <rect x="140" y="146" width="54" height="50" rx="3" fill="var(--scene-room)" />
          <defs>
            <clipPath id={clip}>
              <rect x="140" y="146" width="54" height="50" rx="3" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clip})`}>
            {ghosts.inside}
            <g ref={at("inside")} />
          </g>
          <path d="M167 146 V196 M140 171 H194" stroke="var(--ink)" strokeWidth="2.6" />
          <rect
            x="140"
            y="146"
            width="54"
            height="50"
            rx="3"
            fill="none"
            stroke="var(--ink)"
            strokeWidth="2.6"
          />
          <path
            d="M108 112 L202 52 L296 112 Z"
            fill="var(--scene-roof)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <path
            d="M216 226 V164 a20 20 0 0 1 40 0 V226 Z"
            fill="var(--scene-door)"
            stroke="var(--ink)"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="248" cy="196" r="2.6" fill="var(--ink)" />
          {ghosts.front}
          <g ref={at("front")} />
        </>
      )}
      {children}
    </svg>
  );
}

function useStage(scene: SceneName, start: string | null) {
  const layers = useRef<Record<Pose["layer"], SVGGElement | null>>({
    behind: null,
    inside: null,
    front: null,
  });
  const lid = useRef<SVGGElement | null>(null);
  const stage = useRef<Stage | null>(null);
  // oxlint-disable react-hooks/exhaustive-deps -- the stage is built once per scene
  useEffect(() => {
    const { behind, inside, front } = layers.current;
    if (!behind || !inside || !front) return;
    const cat = document.createElementNS("http://www.w3.org/2000/svg", "g");
    cat.setAttribute("class", "learn-cat");
    cat.innerHTML = CAT;
    stage.current = new Stage(scene, cat, { behind, inside, front }, lid.current, start);
    return () => {
      cat.remove();
      stage.current = null;
    };
  }, [scene]);
  // oxlint-enable react-hooks/exhaustive-deps
  return { layers, lid, stage };
}

/** The sentence with its place word lit. */
function Said({ place }: { place: ScenePlace }) {
  const at = place.sentence.toLowerCase().lastIndexOf(place.word.toLowerCase());
  if (at < 0) return <>{place.sentence}</>;
  return (
    <>
      {place.sentence.slice(0, at)}
      <span className="text-(--form)">{place.sentence.slice(at, at + place.word.length)}</span>
      {place.sentence.slice(at + place.word.length)}
    </>
  );
}

interface SceneProps {
  scene: SceneName;
  /** What the drawing shows, for a screen reader: “A cat and a box”. */
  label: string;
  /** What the keys are, for a screen reader: “Where the cat is”. */
  keysLabel: string;
  places: readonly ScenePlace[];
}

/**
 * An illustrated scene on the stage's tray. Pressing a place, on its key or on the drawing, moves
 * the cat there and plays the sentence that says where it is. Nothing to get wrong.
 */
export function Scene({ scene, label, keysLabel, places }: SceneProps) {
  const first = places.find((place) => PLACES[scene][place.id]?.from === undefined) ?? places[0];
  const [picked, setPicked] = useState<string | null>(null);
  const { layers, lid, stage } = useStage(scene, first?.id ?? null);
  const press = useCallback(
    (place: ScenePlace) => {
      setPicked(place.id);
      void playSound(place.src);
      void stage.current?.go(place.id);
    },
    [stage],
  );
  const shown = places.find((place) => place.id === picked);
  return (
    <div className="grid gap-4">
      <div className="relative mx-auto w-full max-w-[460px]">
        <Drawing scene={scene} layers={layers} lid={lid} label={label}>
          {/* Taps on the drawing; the keys under it are the same places for keyboards. */}
          {places.map((place) => {
            const spot = PLACES[scene][place.id]?.spot;
            return spot ? (
              // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- a pointer shortcut for the keys below
              <rect
                key={place.id}
                x={spot[0]}
                y={spot[1]}
                width={spot[2]}
                height={spot[3]}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => press(place)}
              />
            ) : null;
          })}
        </Drawing>
      </div>
      <fieldset
        className="m-0 grid min-w-0 grid-cols-(--phone) gap-1.5 border-0 p-0 sm:grid-cols-(--wide)"
        style={
          {
            "--wide": `repeat(${Math.min(places.length, 6)}, minmax(0, 1fr))`,
            "--phone": `repeat(${Math.min(places.length, 3)}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
      >
        <legend className="sr-only">{keysLabel}</legend>
        {places.map((place) => (
          <PlaceKey
            key={place.id}
            place={place}
            pressed={picked === place.id}
            onPress={() => press(place)}
          />
        ))}
      </fieldset>
      <div aria-live="polite" className="min-h-16">
        {shown ? (
          <div key={shown.id} className="learn-swap flex items-center gap-3">
            <PlayButton
              src={shown.src}
              label={
                <Trans>
                  Play <span lang="et">{shown.sentence}</span>
                </Trans>
              }
            />
            <p className="grid min-w-0 gap-0.5">
              <span
                lang="et"
                className="text-2xl/tight font-semibold tracking-tight max-sm:text-xl/tight"
              >
                <Said place={shown} />
              </span>
              <span className="text-md text-ink-secondary">{shown.gloss}</span>
            </p>
          </div>
        ) : (
          <p className="text-md text-ink-secondary">
            <Trans>Tap a place to send the cat there and hear where it is.</Trans>
          </p>
        )}
      </div>
    </div>
  );
}

function PlaceKey({
  place,
  pressed,
  onPress,
}: {
  place: ScenePlace;
  pressed: boolean;
  onPress: () => void;
}) {
  const playing = usePlaying(place.src);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-playing={playing ? "" : undefined}
      onClick={onPress}
      className="learn-key grid cursor-pointer justify-items-center gap-0.5 rounded-tile bg-plate px-1 pt-2.5 pb-2 hoverable:hover:bg-plate-hover"
    >
      <b lang="et" className="text-xl/none font-semibold whitespace-nowrap">
        {place.word}
      </b>
      <small className="text-xs text-ink-muted">{place.meaning}</small>
    </button>
  );
}

/** A Scene quiz round: the places, and which one the sentence names. */
export interface SceneItem {
  scene: SceneName;
  /** The drawing, for a screen reader. */
  label: string;
  places: readonly ScenePlace[];
  answer: string;
}

/**
 * Hear a sentence, then tap the place it names on the drawing: a round of a `Quiz`, on its white
 * card. Each place is an outline to tap; once answered the cat appears at the right one, ringed
 * green, and a wrong pick is ringed red and dashed.
 */
export function SceneRound({ item, state, heard, answer, autoplay }: RoundProps<SceneItem>) {
  const { t } = useLingui();
  const { nudge, note } = useNudge();
  const [active, setActive] = useState<string | null>(null);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  const right = item.places.find((place) => place.id === item.answer);
  useAutoplay(right?.src ?? "", autoplay, round);
  const { layers, lid, stage } = useStage(item.scene, null);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  useEffect(() => {
    if (done) void stage.current?.show(item.answer);
  }, [done, item.answer, stage]);
  if (!right) return null;
  const where = PLACES[item.scene];
  if (import.meta.env.DEV && where[item.answer]?.quiz === false)
    throw new Error(`${item.answer} has no place to tap in a ${item.scene} quiz.`);
  const spots = item.places.filter((place) => where[place.id] && where[place.id]?.quiz !== false);
  const markOf = (id: string) =>
    !done ? undefined : id === item.answer ? "right" : id === picked ? "wrong" : undefined;
  const pick = (id: string) => {
    if (done) return;
    if (state.status === "asking" && !state.heard) return nudge();
    answer(id, id === item.answer);
  };
  // Each outline sits in its own layer, so the box hides what it would hide of a cat.
  const ghosts: Partial<Record<Pose["layer"], ReactNode[]>> = {};
  for (const place of spots) {
    const pose = where[place.id]?.pose as Pose;
    ghosts[pose.layer] = [
      ...(ghosts[pose.layer] ?? []),
      <g
        key={place.id}
        className="learn-spot"
        data-mark={markOf(place.id)}
        data-active={active === place.id && !done ? "" : undefined}
        style={{ transform: T(pose) }}
      >
        <path d={OUTLINE} />
      </g>,
    ];
  }
  return (
    <>
      <Listen src={right.src} onPlay={heard} />
      {note}
      <div className="relative mx-auto w-full max-w-[460px]">
        <Drawing scene={item.scene} layers={layers} lid={lid} label={item.label} ghosts={ghosts} />
        {/* The places to tap, laid over the drawing as buttons, so a keyboard can reach them. */}
        {spots.map((place) => {
          const spot = where[place.id]?.spot;
          if (!spot) return null;
          const mark = markOf(place.id);
          return (
            <button
              key={place.id}
              type="button"
              aria-label={
                mark === "right"
                  ? t`${place.meaning}, right answer`
                  : mark === "wrong"
                    ? t`${place.meaning}, your answer`
                    : place.meaning
              }
              aria-disabled={done || undefined}
              onClick={() => pick(place.id)}
              onPointerEnter={() => setActive(place.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(place.id)}
              onBlur={() => setActive(null)}
              className={clsx(
                "learn-spot-key absolute rounded-tile",
                done ? "cursor-default" : "cursor-pointer",
              )}
              style={{
                left: `${(spot[0] / 400) * 100}%`,
                top: `${(spot[1] / 270) * 100}%`,
                width: `${(spot[2] / 400) * 100}%`,
                height: `${(spot[3] / 270) * 100}%`,
              }}
            >
              {/* Its name shows only while a keyboard is on it; the outline is what the eye taps. */}
              <span className="learn-spot-name">{place.meaning}</span>
              {mark && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute -end-1 -top-1 grid size-5 place-items-center rounded-full text-plate ring-3 ring-plate",
                    mark === "right" ? "bg-success" : "bg-danger",
                  )}
                >
                  {mark === "right" ? (
                    <Check aria-hidden="true" className="size-3" strokeWidth={3.2} />
                  ) : (
                    <X aria-hidden="true" className="size-3" strokeWidth={3.2} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {done && (
        <Feedback right={state.right}>
          <span lang="et" className="font-medium text-ink">
            <Said place={right} />
          </span>{" "}
          {right.gloss}
        </Feedback>
      )}
    </>
  );
}
