import { modeOf } from "@lymi/core";
import { type PublicDeckSummary, trayHue } from "@lymi/core/catalog";
import { Image, View } from "react-native";
import { usePalette, useRoom } from "../theme/palette";
import { Text } from "../ui/primitives";

/**
 * The eight tray hues as sRGB, from `packages/design/tray.css`: oklch(0.958 0.042 h) by day and
 * oklch(0.3 0.065 h) at night, so a deck arrives at the same colour as on the web.
 */
const TRAY = {
  light: ["#ffe7e3", "#f2f4d4", "#defae3", "#d2fbfa", "#d7f6ff", "#ebefff", "#fee9ff", "#ffe6f5"],
  dark: ["#491f1d", "#303000", "#11371b", "#003738", "#003249", "#28294e", "#3c2242", "#451f32"],
} as const;
/** The card at night sits lighter than its tray, dark enough that muted text keeps 4.5:1. */
const NIGHT_CARD = "#3a342f";

export function useTrayColour(slug: string): string {
  const room = TRAY[useRoom()];
  return room[trayHue(slug)] ?? room[0];
}

/** A deck's page wears its hue a step quieter, oklch(0.958 0.034 h) and oklch(0.19 0.03 h). */
const COVER = {
  light: ["#ffe9e6", "#f2f4da", "#e2f8e5", "#d8f9f8", "#dcf6ff", "#ecefff", "#fceaff", "#ffe8f4"],
  dark: ["#200e0d", "#151505", "#09180c", "#021818", "#05161f", "#111221", "#1a0f1c", "#1e0e16"],
} as const;

export function useCoverColour(slug: string): string {
  const room = COVER[useRoom()];
  return room[trayHue(slug)] ?? room[0];
}

/** A long word would break mid-letter at the full size, and a long cue would run past three lines. */
function cueStep(text: string): number {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const step = longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14;
  return text.length > 28 ? Math.min(step, 0.1) : step;
}

export type TrayCard = NonNullable<PublicDeckSummary["card"]>;

/** The card turned over as a tray draws it: what its mode asks above the rule, the answer under it. */
export function CardFace({
  card,
  cw,
  imageBase,
}: {
  card: TrayCard;
  cw: number;
  imageBase: string;
}) {
  const p = usePalette();
  const { cue, target } = modeOf(card.mode);
  const picture = cue === "image" ? card.image : undefined;
  const cueText = cue === "meaning" ? card.meaning : card.term;
  const step = cueStep(cueText);
  return (
    <>
      {card.section && (
        <Text
          numberOfLines={1}
          className="font-medium uppercase text-muted"
          style={{ fontSize: Math.max(11, cw * 0.054), letterSpacing: 0.6 }}
          maxFontSizeMultiplier={1}
        >
          {card.section}
        </Text>
      )}
      {picture ? (
        <View style={{ flex: 1, minHeight: 0, marginVertical: cw * 0.06 }}>
          <Image
            source={{
              uri: `${imageBase}/public/media/card/${encodeURIComponent(picture.cardId)}/image`,
            }}
            accessibilityLabel={picture.description}
            style={{
              width: "100%",
              aspectRatio: picture.width / picture.height,
              maxHeight: "100%",
              borderRadius: cw * 0.04,
              borderWidth: 1,
              borderColor: p["image-edge"],
            }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <Text
          numberOfLines={3}
          className="font-medium text-text"
          style={{
            marginTop: cw * 0.06,
            fontSize: Math.max(17, cw * step),
            lineHeight: Math.max(17, cw * step) * 1.12,
            letterSpacing: -0.03 * Math.max(17, cw * step),
          }}
          maxFontSizeMultiplier={1}
        >
          {cueText}
        </Text>
      )}
      <View
        style={{
          marginTop: "auto",
          paddingTop: cw * 0.06,
          borderTopWidth: 1,
          borderTopColor: p["edge-2"],
        }}
      >
        <Text
          numberOfLines={2}
          className={target === "term" ? "font-medium text-text" : "text-text-2"}
          style={{ fontSize: Math.max(12, cw * 0.074), lineHeight: Math.max(12, cw * 0.074) * 1.3 }}
          maxFontSizeMultiplier={1}
        >
          {target === "term" ? card.term : card.meaning}
        </Text>
      </View>
    </>
  );
}

/** How many blank sheets sit behind the card: the deck's own depth, never more than two. */
function paperFor(cardCount: number) {
  return Math.min(Math.max(cardCount - 1, 0), 2);
}

const PAPER = [
  { translateX: 7, translateY: 5, rotate: "1.6deg" },
  { translateX: -6, translateY: 9, rotate: "-2.2deg" },
];

interface TrayProps {
  deck: Pick<PublicDeckSummary, "slug" | "cardCount" | "card">;
  /** The card's width; the tray is cut at two thirds of the card's height. */
  cw: number;
  imageBase: string;
  /** Square corners where the tray runs to the edges of a card that clips it. */
  flush?: boolean;
}

/**
 * One of the deck's own cards tucked into a tray of the deck's hue, with a sheet of paper behind it
 * for each further card, up to two. docs/design/system/surfaces.md "The deck tray".
 */
export function DeckTray({ deck, cw, imageBase, flush = false }: TrayProps) {
  const p = usePalette();
  const dark = useRoom() === "dark";
  const tray = useTrayColour(deck.slug);
  const ch = cw * 1.12;
  const face = dark ? NIGHT_CARD : p.plate;
  const sheet = {
    position: "absolute",
    top: 0,
    left: 0,
    width: cw,
    height: ch,
    borderRadius: cw * 0.1,
    backgroundColor: face,
    borderWidth: 1,
    borderColor: p.edge,
  } as const;
  return (
    <View
      className={flush ? "" : "rounded-lg"}
      style={{
        height: ch * 0.66 + 16,
        paddingTop: 16,
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: tray,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {deck.card && (
        <View style={{ width: cw, height: ch }}>
          {PAPER.slice(0, paperFor(deck.cardCount)).map((t, at) => (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed stack, and the sheets are blank.
              key={at}
              style={{
                ...sheet,
                transform: [
                  { translateX: t.translateX },
                  { translateY: t.translateY },
                  { rotate: t.rotate },
                ],
              }}
            />
          ))}
          <View style={{ ...sheet, padding: cw * 0.085 }}>
            <CardFace card={deck.card} cw={cw} imageBase={imageBase} />
          </View>
        </View>
      )}
    </View>
  );
}
