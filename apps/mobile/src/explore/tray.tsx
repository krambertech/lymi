import { modeOf, REVIEW_MODE_KEYS } from "@lymi/core";
import { type PublicDeckSummary, trayHue } from "@lymi/core/catalog";
import { hues } from "@lymi/design";
import { Image, View } from "react-native";
import { API_URL } from "../auth/client";
import { usePalette, useRoom } from "../theme/palette";
import { Text } from "../ui/primitives";

type Surface = keyof Omit<typeof hues, "nightCard">;

/** A deck's or shelf's hue as one surface wears it, generated from `@lymi/design/tray.css`. */
function useHue(surface: Surface, key: string): string {
  const room = hues[surface][useRoom()];
  return room[trayHue(key)] ?? room[0];
}

export const useTrayColour = (slug: string) => useHue("tray", slug);
/** A deck's page wears its hue a step quieter than its tray. */
export const useCoverColour = (slug: string) => useHue("cover", slug);
/** A shelf's colour follows its address, as on lymi.app, so a shelf looks the same in both. */
export const usePoolColour = (name: string) => useHue("pool", name);

/** A long word would break mid-letter at the full size, and a long cue would run past three lines. */
function cueSize(text: string, cw: number): number {
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length));
  const step = longest >= 13 ? 0.105 : longest >= 10 ? 0.12 : 0.14;
  const size = Math.max(17, cw * (text.length > 28 ? Math.min(step, 0.1) : step));
  // Below the floor rather than breaking the longest word mid-word: the face is 83% of the card wide.
  return Math.min(size, (cw * 0.83) / (longest * 0.6));
}

export type TrayCard = NonNullable<PublicDeckSummary["card"]>;

/** The card turned over as a tray draws it: what its mode asks above the rule, the answer under it. */
export function CardFace({ card, cw }: { card: TrayCard; cw: number }) {
  const p = usePalette();
  // The mode list is open, so a mode added after this release previews as term then meaning.
  const known = (REVIEW_MODE_KEYS as readonly string[]).includes(card.mode);
  const { cue, target } = modeOf(known ? card.mode : "term_to_meaning");
  const picture = cue === "image" ? card.image : undefined;
  const cueText = cue === "meaning" ? card.meaning : card.term;
  const size = cueSize(cueText, cw);
  return (
    <>
      {card.section && (
        <Text
          numberOfLines={1}
          className="font-medium uppercase text-ink-muted"
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
              uri: `${API_URL}/public/media/card/${encodeURIComponent(picture.cardId)}/image`,
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
          className="font-medium text-ink"
          style={{
            marginTop: cw * 0.06,
            fontSize: size,
            lineHeight: size * 1.12,
            letterSpacing: -0.03 * size,
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
          borderTopColor: p["edge-strong"],
        }}
      >
        <Text
          numberOfLines={2}
          className={target === "term" ? "font-medium text-ink" : "text-ink-secondary"}
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
  /** Square corners where the tray runs to the edges of a card that clips it. */
  flush?: boolean;
}

/**
 * One of the deck's own cards tucked into a tray of the deck's hue, with a sheet of paper behind it
 * for each further card, up to two. docs/design/system/surfaces.md "The deck tray".
 */
export function DeckTray({ deck, cw, flush = false }: TrayProps) {
  const p = usePalette();
  const dark = useRoom() === "dark";
  const tray = useTrayColour(deck.slug);
  const ch = cw * 1.12;
  const face = dark ? hues.nightCard : p.plate;
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
            <CardFace card={deck.card} cw={cw} />
          </View>
        </View>
      )}
    </View>
  );
}
