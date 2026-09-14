import { MotionConfig } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useForcedStates } from "./forced-states";
import { SPECIMENS, type SpecimenId } from "./specimens";

/*
 * An overlay takes its shape from the device, not from the page around it (ADR 0017), so a picture
 * of both shapes on one machine needs a document per shape. Each frame is an iframe of the
 * specimen's own route, at a phone's width or a desktop's, and the overlay opens in it for real.
 */

/** The narrowest window that still gets the desktop shape. */
const DESKTOP_WIDTH = 768;
const TOUCH_WIDTH = 390;

function frameSrc(specimen: SpecimenId) {
  return `/design/frame/${specimen}`;
}

/** The same open overlay on a desktop and on a phone, side by side. */
export function DeviceFrames({ specimen }: { specimen: SpecimenId }) {
  const { name, height, touchHeight = height } = SPECIMENS[specimen];
  return (
    <div className="grid w-full items-start gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
      <figure className="grid min-w-0 gap-2">
        <ScaledFrame
          src={frameSrc(specimen)}
          title={`${name} on a desktop`}
          width={DESKTOP_WIDTH}
          height={height}
        />
        <figcaption className="font-mono text-xs text-muted">Desktop</figcaption>
      </figure>
      <figure className="grid min-w-0 gap-2">
        <ScaledFrame
          src={frameSrc(specimen)}
          title={`${name} on a touch device`}
          width={TOUCH_WIDTH}
          height={touchHeight}
        />
        <figcaption className="font-mono text-xs text-muted">Touch</figcaption>
      </figure>
    </div>
  );
}

/** An iframe laid out at its device's width and scaled down to fit its column. */
function ScaledFrame({
  src,
  title,
  width,
  height,
}: {
  src: string;
  title: string;
  width: number;
  height: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setScale(Math.min(1, e.contentRect.width / width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div
      ref={ref}
      className="edge relative w-full overflow-hidden rounded-lg bg-canvas"
      style={{ height: height * scale }}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="absolute start-0 top-0 origin-top-left border-0 rtl:origin-top-right"
        style={{ width, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}

/** Mirrors an attribute from an element in the page around the frame onto this document's root. */
function useMirroredAttribute(
  source: () => Element | null | undefined,
  attribute: "data-theme" | "data-motion",
) {
  const [value, setValue] = useState<string | null>(null);
  useLayoutEffect(() => {
    const from = source();
    const root = document.documentElement;
    const sync = () => {
      const next = from?.getAttribute(attribute) ?? null;
      if (next === null) root.removeAttribute(attribute);
      else root.setAttribute(attribute, next);
      setValue(next);
    };
    sync();
    if (!from) return;
    const observer = new MutationObserver(sync);
    observer.observe(from, { attributeFilter: [attribute] });
    return () => observer.disconnect();
  }, [source, attribute]);
  return value;
}

const canvasAround = () => window.frameElement?.closest("[data-theme]");
const motionAround = () =>
  window.frameElement?.closest("[data-motion]") ??
  (window.parent === window ? null : window.parent.document.documentElement);

let focusPatched = false;

/**
 * An opening overlay focuses a row and scrolls the chosen one into view, and both scroll the page
 * around an iframe too; a design page with several open frames would jump to the last one.
 */
function keepPageStill() {
  if (focusPatched || window.parent === window) return;
  focusPatched = true;
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (options) {
    focus.call(this, { ...options, preventScroll: true });
  };
  Element.prototype.scrollIntoView = () => {};
}

/** The inside of a frame: the specimen on the canvas, in the room and motion of the page around it. */
export function FrameDocument({ specimen }: { specimen: string }) {
  keepPageStill();
  useForcedStates();
  useMirroredAttribute(canvasAround, "data-theme");
  const motion = useMirroredAttribute(motionAround, "data-motion");
  const entry = specimen in SPECIMENS ? SPECIMENS[specimen as SpecimenId] : undefined;
  if (!entry) return <p className="p-5 text-base text-muted">No specimen named “{specimen}”.</p>;
  return (
    <MotionConfig reducedMotion={motion === "reduce" ? "always" : "user"}>
      <div className="min-h-dvh bg-canvas p-5 text-text">
        <entry.Scene />
      </div>
    </MotionConfig>
  );
}
