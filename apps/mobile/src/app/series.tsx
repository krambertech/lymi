import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { SeriesInput, seriesLimits } from "@lymi/core";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { useSeriesList } from "../data/queries";
import { useSeriesActions } from "../data/series";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { GlassButton } from "../ui/glass";
import { Icon, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

/**
 * A series' name, alone in a short sheet: New series, then its decks are chosen on a sheet of their
 * own, so the keyboard is never up over a list. Rename series opens it with the name filled in.
 */
export default function SeriesName() {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const all = useSeriesList(true).data;
  const series = id ? all?.find((s) => s.id === id) : undefined;
  const [name, setName] = useState(series?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const { name: save } = useSeriesActions();

  const submit = () => {
    if (save.isPending) return;
    const parsed = SeriesInput.safeParse({ name });
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the series a name.`);
      return;
    }
    setError(null);
    save.mutate(
      { series, name: parsed.data.name },
      {
        // A new series goes straight on to its decks; a rename is done.
        onSuccess: (saved) =>
          series ? router.back() : router.replace(`/series-decks?id=${saved.id}` as Href),
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <OnGlass>
      <View className="flex-row items-center justify-between gap-3 px-4 pt-5 pb-2">
        <GlassButton icon="close" label={t`Cancel`} onPress={() => router.back()} />
        <Text className="text-md font-medium text-text" accessibilityRole="header">
          {series ? t`Rename series` : t`New series`}
        </Text>
        <GlassButton
          icon={series ? "check" : "forward"}
          label={series ? t`Save` : t`Next: choose decks`}
          primary
          busy={save.isPending}
          onPress={submit}
        />
      </View>
      <View className="px-5 pt-3 pb-6">
        <FieldName>{t`Name`}</FieldName>
        <TextInput
          autoFocus
          value={name}
          maxLength={seriesLimits.name ?? undefined}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          placeholder={t`Learn Estonian`}
          placeholderTextColor={p.muted}
          accessibilityLabel={t`Name`}
          accessibilityHint={error ?? undefined}
          returnKeyType={series ? "done" : "next"}
          onSubmitEditing={submit}
          selectionColor={p.text}
          className="min-h-12 py-1.5 font-sans font-medium text-text"
          style={{ fontSize: 28, letterSpacing: -0.56 }}
          maxFontSizeMultiplier={inputCap(28)}
        />
        {error && (
          <View className="flex-row items-center gap-1.5 pt-2" accessibilityLiveRegion="polite">
            <Icon name="alert" size={14} colour={p.danger} />
            <Text className="flex-1 text-base text-danger">{error}</Text>
          </View>
        )}
      </View>
    </OnGlass>
  );
}
