import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import { focusIndex, type LineColumn, type Opening } from "@lymi/client/section-line";
import { isolate } from "@lymi/core";
import type { Href } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { Button, Press, Text } from "../ui/primitives";

/** The route param for the cards with no section, whose column and page have no section id. */
export const NO_SECTION = "none";

/** A section's page: the deck's page kept to that section, or to the cards with no section. */
export function sectionPage(deckId: string, sectionId: string) {
  return `/library/${deckId}/sections/${sectionId || NO_SECTION}` as Href;
}

/** Every section of a deck, with its progress; the owner edits them there too. */
export function sectionsPage(deckId: string) {
  return `/library/${deckId}/sections` as Href;
}

const share = (n: number, total: number) => (total > 0 ? Math.min(1, n / total) : 0);

/**
 * A section's progress as a ring: known, then learning after it, around a track. A section that
 * waits is a dashed ring; one fully known closes into a filled disc with a check, unless something
 * sits inside it, such as a stop's number on the Sections page.
 */
export function ProgressRing({
  column: c,
  size,
  stroke = 3,
  children,
}: {
  column: Pick<LineColumn, "known" | "learning" | "total" | "waiting">;
  size: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const p = usePalette();
  const r = (size - stroke) / 2;
  const half = size / 2;
  const around = 2 * Math.PI * r;
  const known = share(c.known, c.total);
  const learning = share(c.learning, c.total);
  const done = c.total > 0 && c.known >= c.total;
  const inside = (
    <View className="absolute inset-0 items-center justify-center">
      {children ??
        (c.waiting ? (
          <Icon name="lock" size={Math.round(size * 0.42)} colour={p.muted} strokeWidth={2.25} />
        ) : null)}
    </View>
  );
  if (done && !children)
    return (
      <Svg width={size} height={size} viewBox="0 0 16 16">
        <Circle cx="8" cy="8" r="8" fill={p["state-known"]} />
        <Path
          d="m4.75 8.25 2.25 2.25 4.25-4.5"
          fill="none"
          stroke={p.plate}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {c.waiting ? (
          <Circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={p["edge-2"]}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        ) : (
          <>
            <Circle
              cx={half}
              cy={half}
              r={r}
              fill="none"
              stroke={p["edge-2"]}
              strokeWidth={stroke}
            />
            {learning > 0 && (
              <Circle
                cx={half}
                cy={half}
                r={r}
                fill="none"
                stroke={p["state-learning"]}
                strokeWidth={stroke}
                strokeDasharray={`${(known + learning) * around} ${around}`}
              />
            )}
            {known > 0 && (
              <Circle
                cx={half}
                cy={half}
                r={r}
                fill="none"
                stroke={p["state-known"]}
                strokeWidth={stroke}
                strokeDasharray={`${known * around} ${around}`}
              />
            )}
          </>
        )}
      </Svg>
      {inside}
    </View>
  );
}

const TILE = 116;
const GAP = 8;
/** The summary plate's padding, which the tiles scroll under so the row reads as running on. */
const BLEED = 20;

/**
 * Every section of a deck as a row of tiles that scrolls sideways, each with its ring, its number,
 * its name and how much of it is known, opening on the section the learner is on. A tile opens that
 * section's page. Cards with no section get the last tile. docs/proposals/section-pages.md.
 */
export function SectionLine({
  columns,
  state,
  onOpen,
}: {
  columns: readonly LineColumn[];
  /** What opens next, or null in a deck that opens every section at once. */
  state: Opening | null;
  onOpen: (column: LineColumn) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const ref = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [content, setContent] = useState(0);
  const opened = useRef(false);
  const at = focusIndex(columns, state);
  // Opens on the learner's section, centred, once both widths are known, so the scroll is not clamped short.
  useEffect(() => {
    if (opened.current || !width || content <= width) return;
    opened.current = true;
    const x = BLEED + at * (TILE + GAP) - (width - TILE) / 2;
    ref.current?.scrollTo({ x: Math.max(0, Math.min(x, content - width)), animated: false });
  }, [width, content, at]);
  return (
    <View
      style={{ marginHorizontal: -BLEED }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        decelerationRate="fast"
        snapToInterval={TILE + GAP}
        contentContainerStyle={{ gap: GAP, paddingHorizontal: BLEED }}
        onContentSizeChange={(w) => setContent(w)}
      >
        {columns.map((c, i) => {
          const here = i === at;
          const name = c.section?.name ?? t`No section`;
          const known = i18n.number(c.known);
          const counted = plural(c.total, {
            one: `${name}, ${known} of # card known`,
            other: `${name}, ${known} of # cards known`,
          });
          return (
            <Press
              key={c.id || NO_SECTION}
              onPress={() => onOpen(c)}
              accessibilityRole="button"
              accessibilityLabel={`${c.waiting ? t`${name}, not open yet` : counted}${here && state ? `, ${t`You are here`}` : ""}`}
              style={{ width: TILE }}
            >
              <View
                className="flex-1 justify-between gap-3 rounded-lg"
                style={{
                  padding: 12,
                  minHeight: 108,
                  backgroundColor: c.waiting ? "transparent" : here ? p.plate : p["plate-2"],
                  borderWidth: c.waiting || here ? 1.5 : 0,
                  borderStyle: c.waiting ? "dashed" : "solid",
                  borderColor: here ? p.text : p["edge-2"],
                }}
              >
                <View className="flex-row items-start justify-between">
                  <ProgressRing column={c} size={24} />
                  {c.section && (
                    <Text className="text-xs text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                      {i18n.number(i + 1)}
                    </Text>
                  )}
                </View>
                <View className="gap-0.5">
                  <Text
                    className={`text-sm font-medium ${c.waiting ? "text-text-2" : "text-text"}`}
                    numberOfLines={2}
                  >
                    {name}
                  </Text>
                  <Text className="text-xs text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                    {c.waiting
                      ? plural(c.total, { one: "# card", other: "# cards" })
                      : `${known}/${i18n.number(c.total)}`}
                  </Text>
                </View>
              </View>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * The one sentence under the section line about what opens the next section, with a meter while
 * it waits and Start once it is ready. It counts cards, never a percentage.
 */
export function OpeningLine({
  state,
  due,
  starting,
  onStart,
}: {
  state: Opening;
  /** Cards to review now, so Start takes the amber only when Review does not have it. */
  due: number;
  starting: string | undefined;
  onStart: (section: Section) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const { current } = state;
  // Isolated, so a right-to-left name never reorders the sentence around it.
  const currentName = isolate(current.name);
  if (state.kind === "open") return <Line icon="unlock" sentence={t`Every section is open.`} />;
  const nextName = isolate(state.next.name);
  if (state.kind === "ready") {
    const next = state.next;
    return (
      <View className="gap-3">
        <Line icon="unlock" sentence={t`${{ nextName }} is ready.`} />
        <Button
          label={t`Start ${{ nextName }}`}
          variant={due > 0 ? "secondary" : "primary"}
          loading={starting === next.id}
          onPress={() => onStart(next)}
        />
      </View>
    );
  }
  const needed = i18n.number(current.knownNeeded);
  const total = i18n.number(current.total);
  const left = i18n.number(state.kind === "waits" ? state.left : 0);
  const sentence =
    state.kind === "waits"
      ? t`${{ nextName }} opens when you know ${needed} of ${total} in ${{ currentName }}. ${left} to go.`
      : plural(state.notStarted, {
          one: `${nextName} opens once the last card of ${currentName} comes up in review.`,
          other: `${nextName} opens once the last # cards of ${currentName} come up in review.`,
        });
  const share = current.total > 0 ? Math.min(1, current.known / current.total) : 0;
  const tick = current.total > 0 ? Math.min(1, current.knownNeeded / current.total) : 0;
  return (
    <View className="gap-2.5">
      <Line icon="lock" sentence={sentence} />
      {current.total > 0 && (
        <View className="h-1.5 justify-center" accessibilityElementsHidden>
          <View className="h-1.5 overflow-hidden rounded-full bg-plate-2">
            <View
              className="h-full rounded-full bg-state-known"
              style={{ width: `${share * 100}%` }}
            />
          </View>
          <View
            className="absolute w-0.5 rounded-full"
            style={{
              start: `${tick * 100}%`,
              top: -4,
              bottom: -4,
              marginStart: -1,
              backgroundColor: p["text-2"],
            }}
          />
        </View>
      )}
    </View>
  );
}

/** A waiting section past the next one: it opens after the section before it. */
export function OpensAfter({ before }: { before: Section }) {
  const { t } = useLingui();
  return <Line icon="lock" sentence={t`Opens after ${{ beforeName: isolate(before.name) }}.`} />;
}

function Line({ icon, sentence }: { icon: "lock" | "unlock"; sentence: string }) {
  const p = usePalette();
  return (
    <View className="flex-row items-start gap-2">
      <View className="pt-0.5">
        <Icon name={icon} size={16} colour={p.muted} />
      </View>
      <Text className="flex-1 text-sm text-text-2">{sentence}</Text>
    </View>
  );
}

/**
 * Every section as a column, filled from its foot with known and then learning, side by side across
 * the width, so a deck's progress reads at a glance on the Sections page. A section that waits is a
 * dashed outline, and a short ink bar marks the learner's section. A column opens its section.
 */
export function SectionColumns({
  columns,
  focus,
  onOpen,
}: {
  columns: readonly LineColumn[];
  /** The learner's column, or -1 for none. */
  focus: number;
  onOpen: (column: LineColumn) => void;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const gap = columns.length > 24 ? 2 : 3;
  return (
    <View className="flex-row" style={{ gap }}>
      {columns.map((c, i) => (
        <Press
          key={c.id || NO_SECTION}
          onPress={() => onOpen(c)}
          haptic={false}
          scale={1}
          accessibilityRole="button"
          accessibilityLabel={c.section?.name ?? t`No section`}
          className="gap-1.5"
          style={{ flex: 1 }}
        >
          <View
            className="justify-end overflow-hidden"
            style={{
              height: 56,
              borderRadius: 4,
              backgroundColor: c.waiting ? "transparent" : p["plate-2"],
              borderWidth: c.waiting ? 1 : 0,
              borderStyle: "dashed",
              borderColor: p["edge-2"],
            }}
          >
            {!c.waiting && (
              <>
                <View
                  style={{
                    height: `${share(c.learning, c.total) * 100}%`,
                    backgroundColor: p["state-learning"],
                  }}
                />
                <View
                  style={{
                    height: `${share(c.known, c.total) * 100}%`,
                    backgroundColor: p["state-known"],
                  }}
                />
              </>
            )}
          </View>
          <View
            className="self-center rounded-full"
            style={{
              height: 3,
              width: "70%",
              maxWidth: 16,
              backgroundColor: i === focus ? p.text : "transparent",
            }}
          />
        </Press>
      ))}
    </View>
  );
}
