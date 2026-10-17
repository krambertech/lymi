import { Trans } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { HandOfCards } from "./HandOfCards";
import { HeroGround } from "./HeroScenes";
import type { HandCard } from "./hand-cards";
import { OriginBadge } from "./OriginBadge";

interface Props {
  title: ReactNode;
  lede: ReactNode;
  cards?: readonly HandCard[] | undefined;
  layout?: "fan" | "stack" | undefined;
  /** What the cards came from, drawn behind the hand and told which card is on top. */
  behind?: ((front: string | undefined) => ReactNode) | undefined;
  /** A scene of its own in place of the hand of cards. */
  visual?: ReactNode;
  /** The one action, when the page has a better first step than signing up. */
  action?: ReactNode;
}

/** The headline, one action, and a hand of cards to turn over. */
export function Hero({ title, lede, cards, layout, behind, visual, action }: Props) {
  const [front, setFront] = useState<string>();
  return (
    <div
      className={clsx(
        "mx-auto grid max-w-[1120px] items-center gap-8 px-5 pt-12 pb-16 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[700px] @5xl:gap-14",
        // A scene holds its own ground, so it needs less room than the fan and leaves more to the title.
        visual || behind
          ? "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,470px)]"
          : "@5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @6xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)]",
      )}
    >
      <div className="min-w-0 max-w-[540px]">
        <OriginBadge />
        <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[0.98]">
          {title}
        </h1>
        <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">{lede}</p>
        <div className="mt-8">
          {action ?? (
            <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
              <Trans>Get started</Trans>
            </a>
          )}
        </div>
      </div>

      {visual ??
        (behind ? (
          <HeroGround material={behind(front)}>
            <div className="relative col-span-8 col-start-5 row-span-2 row-start-2">
              <HandOfCards cards={cards} layout="stack" onFront={setFront} />
            </div>
          </HeroGround>
        ) : (
          <HandOfCards cards={cards} layout={layout} />
        ))}
    </div>
  );
}
