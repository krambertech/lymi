import { isImageMode } from "@lymi/core";
import { type PublicDeckOut, previewMode } from "@lymi/core/catalog";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/primitives";
import { CardFace, type TrayCard } from "./tray";

/** One card per section before a second from any, so three cards show the deck's range. */
export function handOf(deck: PublicDeckOut): TrayCard[] {
  const hand: TrayCard[] = [];
  const sections = deck.sections.map((section) => ({
    name: section.name,
    cards: section.cards.filter((card) => card.meaning),
  }));
  for (let round = 0; hand.length < 3; round++) {
    const taken = hand.length;
    for (const section of sections) {
      const card = section.cards[round];
      if (card && hand.length < 3) {
        const mode = previewMode(card, hand.length);
        hand.push({
          term: card.term,
          meaning: card.meaning ?? "",
          section: section.name,
          mode,
          ...(card.image && isImageMode(mode) ? { image: card.image } : {}),
        });
      }
    }
    if (hand.length === taken) break;
  }
  return hand;
}

/** Step from the middle, drop and tilt for a hand of one, two or three; the first lies on top. */
const FANS: [number, number, number][][] = [
  [[0, 0, -2]],
  [
    [0.4, 0, 3],
    [-0.4, 14, -4],
  ],
  [
    [0, 0, 1],
    [-1, 18, -7],
    [1, 22, 6],
  ],
];
/** The same cards squared into a stack once the deck is in Library. */
const STACK: [number, number, number][] = [
  [0, 0, -1],
  [-7, 8, -3],
  [8, 6, 2.5],
];

const CW = 120;
const GAP = CW * 0.7;

function HandCard({
  card,
  at,
  count,
  gathered,
  ground,
}: {
  card: TrayCard;
  at: number;
  count: number;
  gathered: boolean;
  ground: string;
}) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const k = useSharedValue(gathered ? 1 : 0);
  useEffect(() => {
    k.value = reduce ? (gathered ? 1 : 0) : withTiming(gathered ? 1 : 0, { duration: 400 });
  }, [gathered, reduce, k]);
  const [step, drop, tilt] = FANS[count - 1]?.[at] ?? [0, 0, 0];
  const [sx, sy, sr] = STACK[at] ?? [0, 0, 0];
  const moving = useAnimatedStyle(() => ({
    transform: [
      { translateX: step * GAP + (sx - step * GAP) * k.value },
      { translateY: drop + (sy + 8 - drop) * k.value },
      { rotate: `${tilt + (sr - tilt) * k.value}deg` },
    ],
  }));
  const seal = useAnimatedStyle(() => ({
    opacity: k.value,
    transform: [{ scale: 0.6 + 0.4 * k.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 4,
          left: "50%",
          marginLeft: -CW / 2,
          width: CW,
          height: CW * 1.12,
          padding: CW * 0.085,
          borderRadius: CW * 0.1,
          backgroundColor: p.plate,
          borderWidth: 1,
          borderColor: p.edge,
          zIndex: count - at,
        },
        moving,
      ]}
    >
      <CardFace card={card} cw={CW} />
      {at === 0 && (
        <Animated.View
          className="absolute size-[30px] items-center justify-center rounded-full bg-state-known"
          style={[{ top: -10, end: -10, borderWidth: 3, borderColor: ground }, seal]}
        >
          <Icon name="check" size={16} colour={p.plate} strokeWidth={2.75} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/**
 * Up to three of the deck's cards fanned on its colour; once the deck is in Library they gather
 * into one squared stack under a check. Hidden from VoiceOver, which reads the cards below.
 */
export function DeckHand({
  cards,
  gathered,
  ground,
}: {
  cards: TrayCard[];
  gathered: boolean;
  ground: string;
}) {
  return (
    <View
      style={{ width: CW + GAP * 2 + 24, height: CW * 1.12 + 32, alignSelf: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {cards.map((card, at) => (
        <HandCard
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed hand; a term can repeat.
          key={at}
          card={card}
          at={at}
          count={cards.length}
          gathered={gathered}
          ground={ground}
        />
      ))}
    </View>
  );
}
