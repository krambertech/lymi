import { Trans, useLingui } from "@lingui/react/macro";
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { localizedPath } from "../../lib/routes";
import { buttonClass } from "../Button";
import { Lockup } from "../Logo";
import { noun } from "./hand-cards";

const DEAL_MS = 720;
const HINT_AFTER_MS = 1600;

interface Props {
  locale: string;
}

/** The 404 is one card, for the word that describes where the visitor is. */
export function NotFoundView({ locale }: Props) {
  const { t, i18n } = useLingui();
  const [revealed, setRevealed] = useState(false);
  const [turned, setTurned] = useState(false);
  const [hint, setHint] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const flip = useRef<HTMLDivElement>(null);
  const homeHref = localizedPath("landing", locale);
  const meaning = t`A page that isn’t where the link says it is`;

  useEffect(() => {
    document.title = t`Page not found · Lymi`;
    setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, [t]);

  // The card is rendered in place so it shows without script; dealing it is an enhancement.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: `translateY(${el.offsetWidth * 1.4}px) rotate(-4deg) scale(0.9)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: DEAL_MS, easing: "cubic-bezier(0.22, 1, 0.36, 1)", delay: 200 },
    );
  }, []);

  // Anyone who has not turned the card after a moment is shown how.
  useEffect(() => {
    if (turned) return;
    const wait = window.setTimeout(() => {
      setHint(true);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      flip.current?.animate(
        [
          { transform: "scale(1) rotateY(0deg)" },
          { transform: "scale(0.965) rotateY(0deg)", offset: 0.16 },
          { transform: "scale(1) rotateY(-30deg)", offset: 0.55 },
          { transform: "scale(1) rotateY(0deg)" },
        ],
        { duration: 1300, easing: "cubic-bezier(0.37, 0, 0.63, 1)" },
      );
    }, HINT_AFTER_MS + DEAL_MS);
    return () => window.clearTimeout(wait);
  }, [turned]);

  const toggle = () => {
    setTurned(true);
    setHint(false);
    setRevealed((r) => !r);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    toggle();
  };

  const top = (
    <>
      <p className="text-xs font-medium tracking-[0.06em] text-muted uppercase">
        HTTP · {i18n._(noun)}
      </p>
      <p className="mt-3 text-[calc(var(--cw)*0.3)] leading-none font-medium tracking-[-0.04em] text-text tabular-nums">
        404
      </p>
      <p className="hand-ipa mt-2.5 text-md text-muted">/ˌfɔːr.oʊˈfɔːr/</p>
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-5 pb-10">
      <header>
        <a href={homeHref} className="inline-flex rounded-sm outline-offset-4">
          <Lockup size={22} title={t`Lymi home`} />
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pt-8 text-center">
        <div className="hand grid w-full justify-items-center">
          <div className="hand-stage" data-layout="single">
            {/* biome-ignore lint/a11y/useSemanticElements: the card holds paragraphs, which a button element cannot. */}
            <div
              ref={card}
              role="button"
              tabIndex={0}
              aria-label={revealed ? t`Turn the card back` : t`Turn the card over`}
              className="hand-card rounded-xl outline-offset-4"
              data-place="front"
              data-revealed={revealed || undefined}
              onClick={toggle}
              onKeyDown={onKeyDown}
            >
              <div ref={flip} className="hand-flip">
                <div className="hand-face text-start" aria-hidden="true">
                  {top}
                  <p
                    className="hand-hint mt-auto text-base text-muted"
                    data-shown={hint || undefined}
                  >
                    {finePointer ? t`Click to turn it over` : t`Tap to turn it over`}
                  </p>
                </div>
                <div className="hand-face hand-back text-start" aria-hidden="true">
                  {top}
                  <p className="mt-auto border-t border-edge-2 pt-3.5 text-[min(20px,calc(var(--cw)*0.066))] leading-[1.35] text-pretty text-text">
                    {meaning}
                  </p>
                  <p className="mt-2 text-[0.84375rem] leading-[1.45] text-muted">
                    <Trans>You learned this one in context.</Trans>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-medium tracking-[-0.02em] text-balance text-text">
          <Trans>Page not found</Trans>
        </h1>
        <a href={homeHref} className={buttonClass("primary", "md", "mt-6")}>
          <Trans>Go home</Trans>
        </a>

        <p className="sr-only" role="status" aria-live="polite">
          {revealed ? `404: ${meaning}` : ""}
        </p>
      </main>
    </div>
  );
}
