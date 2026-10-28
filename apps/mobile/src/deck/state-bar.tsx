import { useLingui } from "@lingui/react/macro";
import type { StateKey } from "@lymi/client/deck-list";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Text } from "../ui/primitives";
import { StateIcon, stateMarks } from "../ui/state-mark";

type StateCountsOf = Record<StateKey, number>;

/** Known, learning and new as one bar, as a deck's and a section's summary draw it. */
export function StateBar({ counts }: { counts: StateCountsOf }) {
  const p = usePalette();
  return (
    <View
      className="h-2.5 w-full flex-row overflow-hidden rounded-full bg-plate-nested"
      style={{ gap: 2 }}
    >
      {(["known", "learning", "new"] as const)
        .filter((k) => counts[k] > 0)
        .map((k) => (
          <View
            key={k}
            style={{ flexGrow: counts[k], flexBasis: 0, backgroundColor: p[stateMarks[k].tint] }}
          />
        ))}
    </View>
  );
}

/** The three counts under the bar, each with its state's mark. */
export function StateCounts({ counts }: { counts: StateCountsOf }) {
  const { i18n } = useLingui();
  return (
    <View className="flex-row flex-wrap gap-x-4 gap-y-1">
      {(["new", "learning", "known"] as const).map((k) => (
        <View key={k} className="flex-row items-center gap-1.5">
          <StateIcon state={k} size={14} />
          <Text className="text-sm font-medium text-ink">{i18n.number(counts[k])}</Text>
          <Text className="text-sm text-ink-muted">{i18n._(stateMarks[k].groupLabel)}</Text>
        </View>
      ))}
    </View>
  );
}
