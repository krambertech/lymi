import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { seriesForm } from "@lymi/client/library-groups";
import { madeHere } from "@lymi/client/writes";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useDecks, useSeriesList } from "../data/queries";
import { useOnline, useSeriesActions } from "../data/series";
import { usePalette } from "../theme/palette";
import { GlassButton } from "../ui/glass";
import { KeyboardRoom } from "../ui/keyboard";
import { Icon, IconButton, Press, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

/**
 * A series' decks: the learner's own decks to tick, those in the series first and in its order,
 * with arrows to move them. Ticking one adds it last. No keyboard, so the whole list is in reach.
 */
export default function SeriesDecks() {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const list = useSeriesList(true).data;
  const all = list ?? [];
  const form = seriesForm(id, list);
  const series = form.mode === "rename" ? form.series : undefined;
  const online = useOnline();
  const decks = (useDecks().data ?? []).filter((d) => d.role === "owner");
  const [chosen, setChosen] = useState<string[] | null>(null);
  // The series arrives with the sheet when it was just created, so its decks are read once it does.
  useEffect(() => {
    if (series && chosen === null) setChosen(series.deckIds);
  }, [series, chosen]);
  const picked = chosen ?? [];
  const [error, setError] = useState<string | null>(null);
  const { setDecks } = useSeriesActions();
  const byId = new Map(decks.map((d) => [d.id, d]));
  const seriesName = new Map(all.map((s) => [s.id, s.name]));
  const rows = [
    ...picked.flatMap((deckId) => byId.get(deckId) ?? []),
    ...decks.filter((d) => !picked.includes(d.id)),
  ];
  const move = (index: number, by: -1 | 1) =>
    setChosen((ids) => {
      const next = [...(ids ?? [])];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(index + by, 0, moved);
      return next;
    });
  const done = () => {
    if (!series || setDecks.isPending || !online) return;
    setDecks.mutate(
      { series, deckIds: picked },
      { onSuccess: () => router.back(), onError: (e) => setError(errorMessage(e)) },
    );
  };

  return (
    <KeyboardRoom>
      <OnGlass>
        <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
          <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
          <View className="flex-1 items-center">
            <Text className="text-md font-medium text-text" accessibilityRole="header">
              {t`Choose decks`}
            </Text>
            {series && (
              <Text className="text-sm text-muted" numberOfLines={1}>
                {series.name}
              </Text>
            )}
          </View>
          <GlassButton
            icon="check"
            label={t`Save`}
            primary
            busy={setDecks.isPending}
            onPress={done}
          />
        </View>
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-5 pt-3 pb-10">
          <Text className="px-1 text-base text-text-2">
            {decks.length === 0
              ? t`No decks of your own yet. Only decks you create can go in a series.`
              : t`Review these decks together, in this order.`}
          </Text>
          {form.mode === "missing" && (
            <Text className="px-1 text-base text-muted">{t`This series is no longer here.`}</Text>
          )}
          {!online && (
            <Text className="px-1 text-base text-muted">
              {t`Changing series needs a connection.`}
            </Text>
          )}
          {error && (
            <View className="flex-row items-center gap-1.5 px-1" accessibilityLiveRegion="polite">
              <Icon name="alert" size={14} colour={p.danger} />
              <Text className="flex-1 text-base text-danger">{error}</Text>
            </View>
          )}
          {rows.length > 0 && (
            <View className="overflow-hidden rounded-xl border border-edge bg-plate">
              {rows.map((d, i) => {
                const at = picked.indexOf(d.id);
                const inIt = at >= 0;
                const elsewhere =
                  !inIt && d.seriesId && d.seriesId !== id ? seriesName.get(d.seriesId) : undefined;
                const deckName = d.name;
                // A deck made offline joins a series once the Worker has it.
                const waiting = !inIt && madeHere(d.id);
                return (
                  <View
                    key={d.id}
                    className={`min-h-[56px] flex-row items-center gap-3 ps-4 pe-2 ${i > 0 ? "border-t border-edge" : ""}`}
                  >
                    <Press
                      scale={0.99}
                      className="flex-1 flex-row items-center gap-3 py-3"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: inIt, disabled: waiting }}
                      accessibilityLabel={deckName}
                      disabled={waiting}
                      onPress={() =>
                        setChosen((ids) =>
                          inIt ? (ids ?? []).filter((x) => x !== d.id) : [...(ids ?? []), d.id],
                        )
                      }
                    >
                      <View
                        className={`size-[22px] items-center justify-center rounded-full border ${inIt ? "border-text bg-text" : "border-edge-2"}`}
                      >
                        {inIt && <Icon name="check" size={14} colour={p.canvas} strokeWidth={3} />}
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="text-md text-text" numberOfLines={1}>
                          {deckName}
                        </Text>
                        <Text className="text-sm text-muted" numberOfLines={1}>
                          {waiting
                            ? t`Waiting to reach Lymi`
                            : elsewhere
                              ? t`Moves from ${elsewhere}`
                              : d.total === 0
                                ? t`No cards yet`
                                : plural(d.total, { one: "# card", other: "# cards" })}
                        </Text>
                      </View>
                    </Press>
                    {inIt && picked.length > 1 && (
                      <View className="flex-row">
                        <IconButton
                          icon="moveUp"
                          size="sm"
                          label={t`Move ${deckName} up`}
                          disabled={at === 0}
                          onPress={() => move(at, -1)}
                        />
                        <IconButton
                          icon="moveDown"
                          size="sm"
                          label={t`Move ${deckName} down`}
                          disabled={at === picked.length - 1}
                          onPress={() => move(at, 1)}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </OnGlass>
    </KeyboardRoom>
  );
}
