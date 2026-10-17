import { useLingui } from "@lingui/react/macro";
import { errorMessage, type Series } from "@lymi/client/api";
import { seriesForm } from "@lymi/client/library-groups";
import { SeriesInput, seriesLimits } from "@lymi/core";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { FieldName } from "../capture/composer-field";
import { moveBack } from "../data/move-undo";
import { useDecks, useSeriesList } from "../data/queries";
import { useMoveNotice, useSeriesActions } from "../data/series";
import { useOnline } from "../streak/goal-picker";
import { usePalette } from "../theme/palette";
import { inputCap } from "../theme/type";
import { FieldError } from "../ui/field";
import { FormHeader } from "../ui/form-header";
import { Press, Text } from "../ui/primitives";
import { OnGlass } from "../ui/surface";

/**
 * A series' name, alone in a short sheet: New series, then its decks are chosen on a sheet of their
 * own, so the keyboard is never up over a list. Rename series opens it with the name filled in.
 */
export default function SeriesName() {
  const { t } = useLingui();
  const router = useRouter();
  // `?deck=` is a deck's Move to series making a new one: the series starts with that deck.
  const { id, deck } = useLocalSearchParams<{ id?: string; deck?: string }>();
  const form = seriesForm(id, useSeriesList(true).data);
  if (form.mode === "create" || form.mode === "rename") {
    const series = form.mode === "rename" ? form.series : undefined;
    // Keyed by the series, so the name starts from it once it has arrived and never from nothing.
    return <NameForm key={series?.id ?? "new"} series={series} deck={series ? undefined : deck} />;
  }
  return (
    <OnGlass>
      <FormHeader close={{ label: t`Close`, onPress: () => router.back() }} title={t`Series`} />
      {form.mode === "missing" && (
        <Text className="px-5 pt-3 pb-6 text-base text-muted">{t`This series is no longer here.`}</Text>
      )}
    </OnGlass>
  );
}

function NameForm({ series, deck }: { series: Series | undefined; deck?: string | undefined }) {
  const { t } = useLingui();
  const router = useRouter();
  const p = usePalette();
  const online = useOnline();
  const [name, setName] = useState(series?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const { name: save, undoMove } = useSeriesActions();
  const listQuery = useSeriesList(true);
  const notice = useMoveNotice();
  const moving = useDecks().data?.find((d) => d.id === deck);
  // From a deck, Undo needs the deck's place in its old series, so saving waits for it.
  const back = moving ? moveBack(moving.seriesId, listQuery.data) : undefined;
  const waiting = !!deck && !back;
  // Not loading and still no place: the read failed.
  const stuck = waiting && !listQuery.isPending && !listQuery.isFetching;

  const submit = () => {
    if (save.isPending || !online || waiting) return;
    const parsed = SeriesInput.safeParse({ name });
    if (!parsed.success) {
      setError(name.trim() ? t`Keep the name under 80 characters.` : t`Give the series a name.`);
      return;
    }
    setError(null);
    save.mutate(
      { series, name: parsed.data.name, deckIds: deck ? [deck] : undefined },
      {
        // A new series goes straight on to its decks; a rename, or one made from a deck, is done.
        onSuccess: (saved) => {
          if (!series && !deck) {
            router.replace(`/series-decks?id=${saved.id}` as Href);
            return;
          }
          router.back();
          // One write made the series with the deck in it, so Undo moves the deck back alone.
          if (moving && back)
            notice(moving.id, moving.name, saved.name, () => undoMove(moving.id, back));
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <OnGlass>
      {/* From a deck, saving makes the series and moves the deck in one go, as the web's does. */}
      <FormHeader
        close={{ label: t`Cancel`, onPress: () => router.back() }}
        title={series ? t`Rename series` : t`New series`}
        action={{
          icon: series || deck ? "check" : "forward",
          label: series ? t`Save` : deck ? t`Create and move` : t`Next: choose decks`,
          busy: save.isPending || (waiting && !stuck),
          onPress: submit,
        }}
      />
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
          returnKeyType={series || deck ? "done" : "next"}
          onSubmitEditing={submit}
          selectionColor={p.text}
          className="min-h-12 py-1.5 font-sans font-medium text-text"
          style={{ fontSize: 28, letterSpacing: -0.56 }}
          maxFontSizeMultiplier={inputCap(28)}
        />
        {!online && (
          <Text className="pt-2 text-base text-muted">
            {t`Changing series needs a connection.`}
          </Text>
        )}
        {stuck && (
          <Press
            onPress={() => void listQuery.refetch()}
            accessibilityRole="button"
            className="pt-2"
          >
            <FieldError flush>{t`Couldn’t load your series. Try again`}</FieldError>
          </Press>
        )}
        {error && (
          <View className="pt-2">
            <FieldError flush>{error}</FieldError>
          </View>
        )}
      </View>
    </OnGlass>
  );
}
