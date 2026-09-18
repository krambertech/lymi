import { Trans } from "@lingui/react/macro";
import { useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";

interface Props {
  title: ReactNode;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

/** Where the lantern hangs, in percent of the plate. The light is cast from here and stays here. */
const REST = { x: 50, y: 26 };
/** How far the pool leans toward a pointer, in percent of the plate. A lean, never a chase. */
const LEAN = { x: 7, y: 5 };
/** How much of the distance the light closes each frame. Slow enough to trail the pointer. */
const FOLLOW = 0.06;

/**
 * The page's one conversion, and the one place the lantern is lit. The wick catches the first time
 * the section is on screen, and the light it throws leans toward whoever points at it.
 */
export function SignUpSection({ title, note }: Props) {
  const plate = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [lit, setLit] = useState(false);

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

  // The light leans toward a pointer without the lantern leaving its hook: a lamp answers a hand
  // near it, it does not follow one. A coarse pointer cannot hover, and a pointer-led glow is the
  // motion someone who asked for less of it does not want, so both leave the light where it hangs.
  useEffect(() => {
    const el = plate.current;
    if (!el || still) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const target = { ...REST };
    const at = { ...REST };
    let frame = 0;

    const step = () => {
      at.x += (target.x - at.x) * FOLLOW;
      at.y += (target.y - at.y) * FOLLOW;
      el.style.setProperty("--lx", `${at.x.toFixed(2)}%`);
      el.style.setProperty("--ly", `${at.y.toFixed(2)}%`);
      frame =
        Math.abs(target.x - at.x) + Math.abs(target.y - at.y) > 0.05
          ? requestAnimationFrame(step)
          : 0;
    };
    const run = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    const lean = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      const awayX = ((event.clientX - box.left) / box.width) * 100 - REST.x;
      const awayY = ((event.clientY - box.top) / box.height) * 100 - REST.y;
      target.x = REST.x + Math.max(-1, Math.min(1, awayX / 50)) * LEAN.x;
      target.y = REST.y + Math.max(-1, Math.min(1, awayY / 50)) * LEAN.y;
      run();
    };
    const settle = () => {
      target.x = REST.x;
      target.y = REST.y;
      run();
    };

    el.addEventListener("pointermove", lean);
    el.addEventListener("pointerleave", settle);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", lean);
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
