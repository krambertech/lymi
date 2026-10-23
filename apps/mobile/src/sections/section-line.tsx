import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Section } from "@lymi/client/api";
import type { LineColumn, Opening } from "@lymi/client/section-line";
import { isolate } from "@lymi/core";
import type { Href } from "expo-router";
import { useRef, useState } from "react";
import { I18nManager, ScrollView, View } from "react-native";
import { clear, usePalette } from "../theme/palette";
import { Icon } from "../ui/icons";
import { Button, Press, Text } from "../ui/primitives";

/** The route param for the cards with no section, whose column and page have no section id. */
export const NO_SECTION = "none";

/** A section's page: the deck's page kept to that section, or to the cards with no section. */
export function sectionPage(deckId: string, sectionId: string) {
  return `/library/${deckId}/sections/${sectionId || NO_SECTION}` as Href;
}

/** A column never narrows past this; more sections than fit scroll sideways instead. */
const MIN_COLUMN = 22;
const GAP = 4;
const HEIGHT = 52;
const FADE = 28;

/**
 * Every section of a deck as one line of columns, each filled from its foot with what is known and,
 * above it, what is learning. A few sections share the width; past what fits, each keeps its
 * minimum and the line scrolls, opening on the section the learner is on, with a fade on the edge
 * that has more. The current column is ringed and carries a tick where the next section opens. A
 * tap opens that section's page. docs/proposals/section-pages.md.
 */
export function SectionLine({
  columns,
  hereId,
  tick,
  onOpen,
}: {
  columns: readonly LineColumn[];
  /** The section the learner is on, or null in a deck that opens every section at once. */
  hereId: string | null;
  /** Known cards the current section needs before the next opens, drawn across its column. */
  tick: number | null;
  onOpen: (column: LineColumn) => void;
}) {
  const { t, i18n } = useLingui();
  const p = usePalette();
  const [width, setWidth] = useState(0);
  const [x, setX] = useState(0);
  const ref = useRef<ScrollView>(null);
  const opened = useRef(false);
  const n = columns.length;
  const column = Math.max(MIN_COLUMN, (width - GAP * (n - 1)) / n);
  const content = n * column + GAP * (n - 1);
  const scrolls = width > 0 && content > width + 1;
  const at = Math.max(
    0,
    columns.findIndex((c) => c.id === hereId),
  );
  // Opens on the current section once the line has its full width, so the scroll is not clamped short.
  const open = (laidOut: number) => {
    if (opened.current || !scrolls || laidOut < content - 1) return;
    opened.current = true;
    const target = at * (column + GAP) - width / 2 + column / 2;
    ref.current?.scrollTo({ x: Math.max(0, Math.min(target, content - width)), animated: false });
  };
  // React Native mirrors a horizontal scroll view in a right-to-left locale, so the fades follow.
  const fade = (edge: "start" | "end") => {
    const toLeft = (edge === "start") !== I18nManager.isRTL;
    return {
      experimental_backgroundImage: `linear-gradient(to ${toLeft ? "left" : "right"}, ${clear(p.plate)}, ${p.plate})`,
    };
  };
  const more = { start: scrolls && x > 2, end: scrolls && x < content - width - 2 };
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <ScrollView
          ref={ref}
          horizontal
          scrollEnabled={scrolls}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
          scrollEventThrottle={32}
          onContentSizeChange={(w) => open(w)}
          contentContainerStyle={{ gap: GAP }}
        >
          {columns.map((c, i) => {
            const here = c.id === hereId;
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
                accessibilityLabel={`${c.waiting ? t`${name}, not open yet` : counted}${here ? `, ${t`You are here`}` : ""}`}
                className="items-center gap-1"
                style={{ width: column }}
              >
                <Column column={c} width={column} here={here} tick={here ? tick : null} />
                <Text
                  className={`text-xs ${here ? "font-semibold text-text" : "text-muted"}`}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {c.section ? i18n.number(i + 1) : "–"}
                </Text>
              </Press>
            );
          })}
        </ScrollView>
      )}
      {more.start && (
        <View
          pointerEvents="none"
          className="absolute start-0 top-0"
          style={[{ width: FADE, height: HEIGHT + 20 }, fade("start") as object]}
        />
      )}
      {more.end && (
        <View
          pointerEvents="none"
          className="absolute end-0 top-0"
          style={[{ width: FADE, height: HEIGHT + 20 }, fade("end") as object]}
        />
      )}
    </View>
  );
}

/** A section's column: learning stacked on known from the foot, or a lock while it waits. */
function Column({
  column: c,
  width,
  here,
  tick,
}: {
  column: LineColumn;
  width: number;
  here: boolean;
  tick: number | null;
}) {
  const p = usePalette();
  const share = (n: number) => (c.total > 0 ? Math.min(1, n / c.total) : 0);
  return (
    <View
      className="justify-end overflow-hidden bg-plate-2"
      style={{
        width,
        height: HEIGHT,
        borderRadius: Math.min(6, width / 2),
        borderWidth: here ? 2 : 0,
        borderColor: p.text,
      }}
    >
      {c.waiting ? (
        <View className="flex-1 items-center justify-center">
          <Icon name="lock" size={12} colour={p.muted} />
        </View>
      ) : (
        <>
          <View
            style={{ height: `${share(c.learning) * 100}%`, backgroundColor: p["state-learning"] }}
          />
          <View style={{ height: `${share(c.known) * 100}%`, backgroundColor: p["state-known"] }} />
          {tick != null && c.total > 0 && (
            <View
              style={{
                position: "absolute",
                start: 0,
                end: 0,
                height: 2,
                bottom: share(tick) * (HEIGHT - 4) - 1,
                backgroundColor: p.text,
              }}
            />
          )}
        </>
      )}
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
