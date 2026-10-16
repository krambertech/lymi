import { useLingui } from "@lingui/react/macro";
import type { Import, ImportPreview } from "@lymi/client/api";
import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ALWAYS, useReduceMotion } from "../theme/motion";
import { usePalette } from "../theme/palette";
import { Chip } from "../ui/chip";
import { Button, Icon, Plate, Text } from "../ui/primitives";

export type Summary = NonNullable<Import["summary"]>;
export type NoteType = Summary["noteTypes"][number];
export type Sample = ImportPreview["samples"][string][number];

/** A step's question, the one heading the screen reader lands on. */
export function Question({ title, lede }: { title: string; lede?: string | undefined }) {
  return (
    <View className="gap-2">
      <Text
        className="text-2xl font-medium text-text"
        style={{ letterSpacing: -0.4 }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {lede && <Text className="text-md text-text-2">{lede}</Text>}
    </View>
  );
}

/**
 * A step's answers at its foot, where the thumb is: the buttons the full width, a note under them,
 * and Back last, never above the question. imports.md.
 */
export function StepActions({
  onBack,
  note,
  children,
}: {
  onBack?: (() => void) | undefined;
  note?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLingui();
  return (
    <View className="gap-3 border-t border-edge pt-5">
      {children}
      {note}
      {onBack && <Button label={t`Back`} variant="ghost" icon="back" onPress={onBack} />}
    </View>
  );
}

/** A muted line under a step's actions. */
export function StepNote({ children }: { children: string }) {
  return <Text className="px-1 text-center text-sm text-muted">{children}</Text>;
}

/** What the import keeps or leaves: a check for kept, a minus for left out. Never colour alone. */
export function Line({ tone, children }: { tone: "good" | "skip"; children: ReactNode }) {
  const p = usePalette();
  return (
    <View className="flex-row items-start gap-2.5">
      <View className="pt-0.5">
        <Icon
          name={tone === "good" ? "known" : "remove"}
          size={18}
          colour={tone === "good" ? p.good : p.muted}
        />
      </View>
      <Text className="flex-1 text-base text-text-2">{children}</Text>
    </View>
  );
}

/** Figures side by side on one plate, hairlines between them. */
export function Figures({ figures }: { figures: { label: string; value: number | undefined }[] }) {
  const { i18n } = useLingui();
  return (
    <Plate className="flex-row">
      {figures.map((figure, i) => (
        <View
          key={figure.label}
          className={`flex-1 gap-0.5 px-4 py-3 ${i > 0 ? "border-s border-edge" : ""}`}
          accessible
          accessibilityLabel={
            figure.value === undefined
              ? figure.label
              : `${i18n.number(figure.value)} ${figure.label}`
          }
        >
          {figure.value === undefined ? (
            <View className="h-8 w-12 rounded-sm bg-plate-2" />
          ) : (
            <Text
              className="text-2xl font-medium text-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {i18n.number(figure.value)}
            </Text>
          )}
          <Text className="text-sm text-muted">{figure.label}</Text>
        </View>
      ))}
    </Plate>
  );
}

/**
 * Work whose length is not known, such as reading a file: a third of the track sweeps across it,
 * and under Reduce Motion the whole track holds still, dimmed.
 */
export function Sweep({ label }: { label: string }) {
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    x.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad), reduceMotion: ALWAYS }),
      -1,
      true,
    );
    return () => cancelAnimation(x);
  }, [reduce, x]);
  const style = useAnimatedStyle(() => ({ left: `${x.value * 66.6}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      className="h-2 w-full overflow-hidden rounded-full bg-plate-2"
    >
      {reduce ? (
        <View className="h-full w-full rounded-full bg-text-2 opacity-40" />
      ) : (
        <Animated.View
          className="h-full rounded-full bg-text-2"
          style={[{ position: "absolute", width: "33.4%" }, style]}
        />
      )}
    </View>
  );
}

/**
 * One imported card as it will arrive: the term large, the rule, then everything under it, in the
 * order the card page shows a card. It is the learner's check that the fields are read right.
 */
export function SampleCard({ sample, loading }: { sample: Sample | undefined; loading: boolean }) {
  const { t } = useLingui();
  const p = usePalette();
  if (!sample) {
    return (
      <View className="min-h-40 items-center justify-center rounded-lg bg-plate-2 p-5">
        <Text className="text-center text-base text-muted">
          {loading ? t`Getting a card ready…` : t`No card of this kind has a term.`}
        </Text>
      </View>
    );
  }
  const rows: [string, string | null][] = [
    [t`Pronunciation`, sample.pronunciation],
    [t`Example`, sample.example],
    [t`Notes`, sample.notes],
  ];
  return (
    <View className={`gap-3 ${loading ? "opacity-60" : ""}`}>
      <Text className="text-3xl font-medium text-text" style={{ letterSpacing: -0.8 }}>
        {sample.term}
      </Text>
      <View className="h-px bg-edge" />
      <View className="flex-row items-start gap-3">
        <Text className={`flex-1 text-xl ${sample.meaning ? "text-text" : "text-muted"}`}>
          {sample.meaning ?? t`No meaning`}
        </Text>
        {sample.picture && (
          <View
            className="size-14 items-center justify-center rounded-md bg-plate-2"
            accessible
            accessibilityLabel={t`Has a picture`}
          >
            <Icon name="picture" size={20} colour={p.muted} />
          </View>
        )}
      </View>
      {rows.some(([, value]) => value) && (
        <View className="gap-2">
          {rows.map(([label, value]) =>
            value ? (
              <View key={label} className="gap-0.5">
                <Text className="text-sm text-muted">{label}</Text>
                <Text className="text-base text-text-2" numberOfLines={3}>
                  {value}
                </Text>
              </View>
            ) : null,
          )}
        </View>
      )}
      {sample.modes.length > 1 && (
        <Text className="text-sm text-muted">
          {t`Asked both ways: from the term, and from the meaning.`}
        </Text>
      )}
      {sample.tags.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {sample.tags.map((tag) => (
            <Chip key={tag} size="sm">
              {tag}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

/** A deck's name as the file nests it, "Japanese::N5" read as "Japanese / N5". */
export const deckName = (name: string) => name.split("::").join(" / ");
