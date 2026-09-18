import { Trans } from "@lingui/react/macro";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { Lantern } from "../Lantern";

interface Props {
  title: ReactNode;
  /** A line under the invitation, for what this page promises that isn't in every account yet. */
  note?: ReactNode;
}

/**
 * The page's one conversion, and the one place the lantern is lit. The wick catches the first time
 * the section is on screen, and the pool of light it throws opens behind it.
 */
export function SignUpSection({ title, note }: Props) {
  const plate = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  // Once only: a light that relights on every scroll past is a blinking advertisement.
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
              key={lit ? "lit" : "unlit"}
              glow
              flicker
              catchLight={lit}
              className="size-full"
            />
          </span>
          <h2 className="mx-auto max-w-[16ch] text-4xl font-medium tracking-[-0.035em] text-balance text-text @2xl:text-5xl">
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
