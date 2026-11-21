import { type ReactNode, useState } from "react";
import type { HandCard } from "./hand-cards";
import { HandOfCards } from "./HandOfCards";
import { Hero, type HeroLink } from "./Hero";
import { HeroGround } from "./HeroScenes";

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
export function CardsHero({
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
    // A scene holds its own ground, so it needs less room than the fan and leaves more to the title.
    <Hero visualWidth={visual || behind ? 420 : 540}>
      <Hero.Copy>
        <Hero.Badges>{badge}</Hero.Badges>
        <Hero.Title>{title}</Hero.Title>
        <Hero.Lede>{lede}</Hero.Lede>
        <Hero.Actions secondary={secondary} after={after} />
      </Hero.Copy>
      <Hero.Visual>
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
      </Hero.Visual>
    </Hero>
  );
}
