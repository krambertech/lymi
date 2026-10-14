import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { useRouter } from "expo-router";
import { Alert, ScrollView, View } from "react-native";
import { useSeriesList } from "../data/queries";
import { useSeriesActions } from "../data/series";
import { useOnline } from "../streak/goal-picker";
import { DragList } from "../ui/drag-list";
import { FormHeader } from "../ui/form-header";
import { Plate, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

/**
 * The order series stand in in Library: each dragged by its handle, saved as it drops, as Sections
 * are in Edit. VoiceOver moves one up or down from its actions. library-decks-and-cards.md.
 */
export default function SeriesOrder() {
  const { t } = useLingui();
  const router = useRouter();
  const list = useSeriesList(true).data ?? [];
  const { order } = useSeriesActions();
  const online = useOnline();
  const ids = list.map((s) => s.id);
  const save = (next: string[]) => {
    if (next.join() === ids.join()) return;
    // A series write has no place on screen to say it failed, so iOS says it.
    order.mutate(next, { onError: (e) => Alert.alert(t`That didn’t go through`, errorMessage(e)) });
  };
  const shift = (at: number, by: -1 | 1) => {
    const next = [...ids];
    const [moved] = next.splice(at, 1);
    if (moved) next.splice(at + by, 0, moved);
    save(next);
  };
  return (
    <OnGlass>
      <FormHeader
        close={{ label: t`Close`, onPress: () => router.back() }}
        title={t`Series order`}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 px-5 pt-3 pb-10"
      >
        <Text className="text-base text-text-2">
          {online
            ? t`Drag a series by its handle. Library shows them in this order.`
            : t`Changing series needs a connection.`}
        </Text>
        <Plate className="overflow-hidden">
          <DragList
            items={list}
            busy={order.isPending || !online}
            onDrop={save}
            render={(s, at, handle) => {
              const seriesName = s.name;
              return (
                <View
                  className="h-full flex-row items-center gap-3 bg-plate ps-4 pe-1"
                  accessible
                  accessibilityLabel={t`${seriesName}, ${plural(s.deckIds.length, { one: "# deck", other: "# decks" })}`}
                  accessibilityActions={[
                    ...(at > 0 ? [{ name: "up", label: t`Move up` }] : []),
                    ...(at < list.length - 1 ? [{ name: "down", label: t`Move down` }] : []),
                  ]}
                  onAccessibilityAction={(e) =>
                    shift(at, e.nativeEvent.actionName === "up" ? -1 : 1)
                  }
                >
                  <View className="flex-1">
                    <Text className="text-md text-text" numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text className="text-sm text-muted">
                      {plural(s.deckIds.length, { one: "# deck", other: "# decks" })}
                    </Text>
                  </View>
                  {handle}
                </View>
              );
            }}
          />
        </Plate>
      </ScrollView>
    </OnGlass>
  );
}
