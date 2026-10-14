import { Trans } from "@lingui/react/macro";
import { type ReactNode, useState } from "react";
import { signUpUrl } from "../../lib/origins";
import { buttonClass } from "../Button";
import { HandOfCards } from "./HandOfCards";
import type { HandCard } from "./hand-cards";
import { OriginBadge } from "./OriginBadge";

interface Props {
  title: ReactNode;
  lede: ReactNode;
  cards?: readonly HandCard[] | undefined;
  layout?: "fan" | "stack" | undefined;
  /** What the cards came from, drawn behind the hand and told which card is on top. */
  behind?: ((front: string | undefined) => ReactNode) | undefined;
}

/** The headline, one action, and a hand of cards to turn over. */
export function Hero({ title, lede, cards, layout, behind }: Props) {
  const [front, setFront] = useState<string>();
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-8 px-5 pt-12 pb-16 @2xl:px-10 @4xl:pt-14 @5xl:min-h-[700px] @5xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)] @5xl:gap-14 @6xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)]">
      <div className="min-w-0 max-w-[540px]">
        <OriginBadge />
        <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[0.98]">
          {title}
        </h1>
        <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">{lede}</p>
        <div className="mt-8">
          <a href={signUpUrl()} className={buttonClass("primary", "lg")}>
            <Trans>Get started</Trans>
          </a>
        </div>
      </div>

      {behind ? (
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute start-0 top-0 w-[64%] max-w-[330px] -rotate-3"
          >
            {behind(front)}
          </div>
          <div className="relative ms-auto w-[64%] pt-24">
            <HandOfCards cards={cards} layout="stack" onFront={setFront} />
          </div>
        </div>
      ) : (
        <HandOfCards cards={cards} layout={layout} />
      )}
    </div>
  );
}
