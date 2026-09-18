import { Trans } from "@lingui/react/macro";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";

interface Props {
  title: ReactNode;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

/** Where the lantern hangs, in fractions of the plate. The light is cast from here and returns. */
const REST = { x: 0.5, y: 0.26 };
/** How much of the distance the light closes each frame. Low, so the light has weight behind it. */
const FOLLOW = 0.045;

/**
 * The page's one conversion, and the one place the lantern is lit. The wick catches the first time
 * the section is on screen, and the light it throws leans toward whoever points at it.
 */
export function SignUpSection({ title, note }: Props) {
  const plate = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [lit, setLit] = useState(false);

  /** Put the light back on its hook, in pixels from the plate's corner. */
  const hang = useCallback((el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    el.style.setProperty("--lx", (box.width * REST.x).toFixed(1));
    el.style.setProperty("--ly", (box.height * REST.y).toFixed(1));
  }, []);

  // Before paint, so the pool is never seen in the plate's corner, and again when the plate is
  // resized: the hook is a fraction of a width that changes with the window.
  useLayoutEffect(() => {
    const el = plate.current;
    if (!el) return;
    hang(el);
    if (!("ResizeObserver" in window)) return;
    const watch = new ResizeObserver(() => {
      if (!el.dataset.led) hang(el);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, [hang]);

  // The wick catches the first time the plate is on screen, so the section is alive before it is
  // touched. Once only: a light that relights on every scroll past is a blinking advertisement.
  useEffect(() => {
    const el = plate.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setLit(true);
      return;
    }
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setLit(true);
        watch.disconnect();
      },
      { threshold: 0.35 },
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // The light goes where the reader looks, while the lantern stays on its hook. A coarse pointer
  // cannot hover, and a glow that tracks a pointer is the motion someone who asked for less of it
  // does not want, so both leave the light hanging over the headline.
  useEffect(() => {
    const el = plate.current;
    if (!el || still) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    // In pixels, not percentages: the pool is moved with `translate`, which the compositor can do
    // on its own. Writing its `top` and `left` every frame asks for layout on a blurred element
    // instead, and under load that arrives in jumps rather than as motion.
    let box = el.getBoundingClientRect();
    const target = { x: box.width * REST.x, y: box.height * REST.y };
    const at = { ...target };
    let frame = 0;

    const step = () => {
      at.x += (target.x - at.x) * FOLLOW;
      at.y += (target.y - at.y) * FOLLOW;
      el.style.setProperty("--lx", at.x.toFixed(1));
      el.style.setProperty("--ly", at.y.toFixed(1));
      frame =
        Math.abs(target.x - at.x) + Math.abs(target.y - at.y) > 0.5
          ? requestAnimationFrame(step)
          : 0;
    };
    const run = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    const lead = (event: PointerEvent) => {
      box = el.getBoundingClientRect();
      el.dataset.led = "";
      target.x = event.clientX - box.left;
      target.y = event.clientY - box.top;
      run();
    };
    const settle = () => {
      box = el.getBoundingClientRect();
      delete el.dataset.led;
      target.x = box.width * REST.x;
      target.y = box.height * REST.y;
      run();
    };

    el.addEventListener("pointerover", lead);
    el.addEventListener("pointermove", lead);
    el.addEventListener("pointerleave", settle);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerover", lead);
      el.removeEventListener("pointermove", lead);
      el.removeEventListener("pointerleave", settle);
    };
  }, [still]);

  return (
    <section id="sign-up" className="scroll-mt-8 px-5 py-20 @2xl:px-10 @4xl:py-28">
      <div
        ref={plate}
        data-lit={lit || undefined}
        className="signup-plate mx-auto max-w-[1040px] rounded-2xl bg-plate-2 px-7 py-16 text-center edge-inset @2xl:px-12 @4xl:px-16 @4xl:py-20"
      >
        <span aria-hidden="true" className="signup-pool" />
        <div className="relative">
          <span className="signup-lamp">
            <Lantern
              key={lit ? "lit" : "dark"}
              glow
              flicker
              catchLight={lit}
              className="size-full"
            />
          </span>
          <h2 className="mx-auto max-w-[16ch] text-4xl font-medium tracking-[-0.035em] text-balance text-text @2xl:text-5xl @4xl:text-6xl">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-[44ch] text-lg text-pretty text-text-2">
            <Trans>Lymi is free to use, and your first card takes a minute.</Trans>
          </p>
          <div className="mt-9">
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
          </div>
          {note && (
            <p className="mx-auto mt-9 max-w-[52ch] text-sm text-pretty text-muted">{note}</p>
          )}
        </div>
      </div>
    </section>
  );
}
