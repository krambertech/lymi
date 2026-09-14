import { Trans } from "@lingui/react/macro";
import type { ReactNode } from "react";
import { buttonClass } from "../Button";
import { HandOfCards } from "./HandOfCards";
import type { HandCard } from "./hand-cards";

interface Props {
  title: ReactNode;
  lede: ReactNode;
  cards?: readonly HandCard[] | undefined;
  layout?: "fan" | "stack" | undefined;
}

/** The headline, one action, and a hand of cards to turn over. */
export function Hero({ title, lede, cards, layout }: Props) {
  return (
    <div className="mx-auto grid max-w-[1120px] items-center gap-8 px-5 pt-12 pb-16 @2xl:px-10 @4xl:min-h-[700px] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,540px)] @4xl:gap-14 @4xl:pt-14">
      <div className="min-w-0 max-w-[540px]">
        <h1 className="text-5xl font-medium tracking-[-0.038em] text-balance text-text @4xl:text-[4.25rem] @4xl:leading-[0.98]">
          {title}
        </h1>
        <p className="mt-6 max-w-[44ch] text-lg text-pretty text-text-2 @2xl:text-xl">{lede}</p>
        <div className="mt-8">
          <a href="#join" className={buttonClass("primary", "lg")}>
            <Trans>Request access</Trans>
          </a>
        </div>
      </div>

      <HandOfCards cards={cards} layout={layout} />
    </div>
  );
}
