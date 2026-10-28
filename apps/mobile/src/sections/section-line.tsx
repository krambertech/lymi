import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import { focusIndex, type LineColumn, type Opening } from "@lymi/client/section-line";
import { isolate } from "@lymi/core";
import type { Href } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { Button, Press, Text } from "../ui/primitives";

/** The route param for the cards with no section, whose column and page have no section id. */
export const NO_SECTION = "none";

/** A section's page: the deck's page kept to that section, or to the cards with no section. */
export function sectionPage(deckId: string, sectionId: string, fromSections = false) {
  const page = `/library/${deckId}/sections/${sectionId || NO_SECTION}`;
  return (fromSections ? `${page}?from=sections` : page) as Href;
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
          <Icon
            name="lock"
            size={Math.round(size * 0.42)}
            colour={p["ink-muted"]}
            strokeWidth={2.25}
          />
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
            stroke={p["edge-strong"]}
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
              stroke={p["edge-strong"]}
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
  // The width last centred at, so a resize, such as iPad's split view, centres again.
  const centred = useRef(0);
  const at = focusIndex(columns, state);
  // A tile widens with the text size, so a name breaks between words rather than inside one.
  const { fontScale } = useWindowDimensions();
  const tile = Math.round(TILE * Math.min(Math.max(fontScale, 1), 1.8));
  // Opens on the learner's section, centred, once both widths are known, so the scroll is not clamped short.
  useEffect(() => {
    if (centred.current === width || !width || content <= width) return;
    centred.current = width;
    const x = BLEED + at * (tile + GAP) - (width - tile) / 2;
    ref.current?.scrollTo({ x: Math.max(0, Math.min(x, content - width)), animated: false });
  }, [width, content, at, tile]);
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
        snapToInterval={tile + GAP}
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
              style={{ width: tile }}
            >
              <View
                className="flex-1 justify-between gap-3 rounded-lg"
                style={{
                  padding: 12,
                  minHeight: 108,
                  backgroundColor: c.waiting ? "transparent" : here ? p.plate : p["plate-nested"],
                  borderWidth: c.waiting || here ? 1.5 : 0,
                  borderStyle: c.waiting ? "dashed" : "solid",
                  borderColor: here ? p.ink : p["edge-strong"],
                }}
              >
                <View className="flex-row items-start justify-between">
                  <ProgressRing column={c} size={24} />
                  {c.section && (
                    <Text
                      className="text-xs text-ink-muted"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {i18n.number(i + 1)}
                    </Text>
                  )}
                </View>
                <View className="gap-0.5">
                  <Text
                    className={`text-sm font-medium ${c.waiting ? "text-ink-secondary" : "text-ink"}`}
                    numberOfLines={2}
                  >
                    {name}
                  </Text>
                  <Text
                    className="text-xs text-ink-muted"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {c.waiting
                      ? plural(c.total, { one: "# card", other: "# cards" })
                      : c.total === 0
                        ? t`No cards yet`
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
 * The one sentence under the section tiles about what opens the next section, with Start once it
 * is ready. It counts cards, never a percentage; the tiles already draw each section's progress.
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
  return <Line icon="lock" sentence={sentence} />;
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
        <Icon name={icon} size={16} colour={p["ink-muted"]} />
      </View>
      <Text className="flex-1 text-sm text-ink-secondary">{sentence}</Text>
    </View>
  );
}

/** Under five sections a column keeps this width rather than stretching into a slab. */
const FEW_COLUMN = 32;
/** Narrower than this a column stops reading as a bar, so the chart scrolls instead. */
const MIN_COLUMN = 12;
const COLUMN_GAP = 3;

/**
 * Every section as a column, filled from its foot with known and then learning, so a deck's
 * progress reads at a glance on the Sections page. Under five sections the columns keep a fixed
 * width; from five they share the width, and past what fits at 12 pt each the chart scrolls under
 * the plate's padding, opening on the learner's column. A section that waits is a dashed outline,
 * and a short ink bar marks the learner's. A column opens its section.
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
  const ref = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  // The width last centred at, so a resize, such as iPad's split view, centres again.
  const centred = useRef(0);
  const n = columns.length;
  const shared = (width - COLUMN_GAP * (n - 1)) / n;
  const scrolls = n >= 5 && shared < MIN_COLUMN;
  const column = n < 5 ? FEW_COLUMN : Math.max(MIN_COLUMN, shared);
  const content = BLEED * 2 + n * column + COLUMN_GAP * (n - 1);
  // Opens on the learner's column, centred, once the chart knows its width.
  useEffect(() => {
    if (centred.current === width || !width || !scrolls || focus < 0) return;
    centred.current = width;
    const viewport = width + BLEED * 2;
    const x = BLEED + focus * (column + COLUMN_GAP) - (viewport - column) / 2;
    ref.current?.scrollTo({ x: Math.max(0, Math.min(x, content - viewport)), animated: false });
  }, [scrolls, focus, width, column, content]);
  const bars = columns.map((c, i) => (
    <Press
      key={c.id || NO_SECTION}
      onPress={() => onOpen(c)}
      haptic={false}
      scale={1}
      accessibilityRole="button"
      accessibilityLabel={c.section?.name ?? t`No section`}
      className="gap-1.5"
      style={{ width: column }}
    >
      <View
        className="justify-end overflow-hidden"
        style={{
          height: 56,
          borderRadius: 4,
          backgroundColor: c.waiting ? "transparent" : p["plate-nested"],
          borderWidth: c.waiting ? 1 : 0,
          borderStyle: "dashed",
          borderColor: p["edge-strong"],
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
          width: Math.min(column * 0.7, 16),
          backgroundColor: i === focus ? p.ink : "transparent",
        }}
      />
    </Press>
  ));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 &&
        (scrolls ? (
          <ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ marginHorizontal: -BLEED }}
            contentContainerStyle={{ gap: COLUMN_GAP, paddingHorizontal: BLEED }}
          >
            {bars}
          </ScrollView>
        ) : (
          <View className="flex-row" style={{ gap: COLUMN_GAP }}>
            {bars}
          </View>
        ))}
    </View>
  );
}
