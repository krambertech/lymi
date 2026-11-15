import { type ReactNode, useState } from "react";
import { HandOfCards } from "./HandOfCards";
import {
  HeroActions,
  HeroBadges,
  HeroFrame,
  HeroLede,
  type HeroLink,
  HeroTitle,
} from "./HeroParts";
import { HeroGround } from "./HeroScenes";
import type { HandCard } from "./hand-cards";

interface Props {
  title: ReactNode;
  lede: ReactNode;
  cards?: readonly HandCard[] | undefined;
  layout?: "fan" | "stack" | undefined;
  /** What the cards came from, drawn behind the hand and told which card is on top. */
  behind?: ((front: string | undefined) => ReactNode) | undefined;
  /** A scene of its own in place of the hand of cards. */
  visual?: ReactNode;
  /** A quieter second way in, beside Get started. */
  secondary?: HeroLink | undefined;
  /** A small line under the actions. */
  after?: ReactNode;
  /** A pill above the title, shown to everyone, beside the origin badge when one shows. */
  badge?: ReactNode;
}

/** The headline, one action, and a hand of cards to turn over. */
export function Hero({
  title,
  lede,
  cards,
  layout,
  behind,
  visual,
  secondary,
  after,
  badge,
}: Props) {
  const [front, setFront] = useState<string>();
  return (
    <HeroFrame
      // A scene holds its own ground, so it needs less room than the fan and leaves more to the title.
      visualWidth={visual || behind ? 420 : 540}
      copy={
        <>
          <HeroBadges>{badge}</HeroBadges>
          <HeroTitle>{title}</HeroTitle>
          <HeroLede>{lede}</HeroLede>
          <HeroActions secondary={secondary} after={after} />
        </>
      }
      visual={
        visual ??
        (behind ? (
          <HeroGround material={behind(front)}>
            <div className="relative col-span-8 col-start-5 row-span-2 row-start-2">
              <HandOfCards cards={cards} layout="stack" onFront={setFront} />
            </div>
          </HeroGround>
        ) : (
          <HandOfCards cards={cards} layout={layout} />
        ))
      }
    />
  );
}
