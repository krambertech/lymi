import { useLingui } from "@lingui/react/macro";
import { errorMessage } from "@lymi/client/api";
import { startUpload } from "@lymi/client/imports";
import type { ImportSource } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { usePalette } from "../theme/palette";
import { Button, Plate, Press, RowArrow, Text } from "../ui/primitives";
import { ImportShell } from "./shell";
import {
  type FileSource,
  hasGuide,
  openGuide,
  type Picked,
  pickFile,
  refusal,
  SOURCE_NAMES,
  SOURCES,
  STEPS,
  uploadSource,
} from "./sources";

/** The apps Lymi imports from, one row each, leading to that app's import page. imports.md. */
export function ImportSources() {
  const { t, i18n } = useLingui();
  const router = useRouter();
  return (
    <ImportShell
      title={t`Import`}
      description={t`Import decks from another app. Pictures, tags and review history come with them. Your other app is unchanged.`}
    >
      <Plate className="overflow-hidden" accessibilityLabel={t`Apps you can import from`}>
        {SOURCES.map(({ source, detail }, i) => (
          <Press
            key={source}
            onPress={() => router.push(`/import/${source}` as Href)}
            scale={0.99}
            accessibilityRole="link"
            accessibilityLabel={`${SOURCE_NAMES[source]}, ${i18n._(detail)}`}
          >
            <View
              className={`min-h-16 flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-edge" : ""}`}
            >
              <View className="flex-1 gap-0.5">
                <Text className="text-md font-medium text-text">{SOURCE_NAMES[source]}</Text>
                <Text className="text-sm text-muted">{i18n._(detail)}</Text>
              </View>
              <RowArrow />
            </View>
          </Press>
        ))}
      </Plate>
    </ImportShell>
  );
}

/** One app's import page: its export steps first, then Choose file at the thumb. imports.md. */
export function ImportStart({ source }: { source: FileSource }) {
  const { t, i18n } = useLingui();
  const qc = useQueryClient();
  const router = useRouter();
  const [refused, setRefused] = useState<string | null>(null);
  const app = SOURCE_NAMES[source];
  const start = useMutation({
    mutationFn: (picked: Picked) => startUpload(uploadSource(picked), qc),
    onSuccess: (item) => router.replace(`/import/${item.id}` as Href),
  });
  const choose = async () => {
    const picked = await pickFile().catch(() => null);
    if (!picked) return;
    const problem = refusal(source, picked);
    setRefused(problem);
    if (!problem) start.mutate(picked);
  };
  const message = refused ?? (start.isError ? errorMessage(start.error) : null);
  const hint =
    source === "mochi"
      ? t`A .mochi file, up to 1 GB.`
      : source === "noji"
        ? t`An .ofc file, up to 1 GB.`
        : source === "lymi"
          ? t`A .zip file, up to 1 GB.`
          : t`An .apkg or .colpkg file, up to 1 GB.`;

  return (
    <ImportShell
      title={t`Import from ${app}`}
      description={
        source === "lymi"
          ? t`Import decks from another Lymi account, with their pictures, tags and review history. Cards keep their due dates.`
          : source === "noji"
            ? t`Import your decks with their sub-decks, pictures and learning progress. Cards keep their due dates, and Noji is unchanged.`
            : t`Import your decks with their pictures, tags and review history. Cards keep their due dates, and ${app} is unchanged.`
      }
    >
      <View className="gap-3">
        <Text className="px-1 text-md font-medium text-text" accessibilityRole="header">
          {t`Exporting from ${app}`}
        </Text>
        <Steps steps={STEPS[source].map((step) => i18n._(step))} />
        {hasGuide(source) && (
          <View className="flex-row">
            <Button
              label={t`Stuck? Read the guide`}
              variant="ghost"
              size="sm"
              icon="web"
              onPress={() => openGuide(source)}
            />
          </View>
        )}
      </View>

      <View className="gap-2">
        <Button
          label={t`Choose file`}
          icon="fileIn"
          variant="primary"
          size="lg"
          loading={start.isPending}
          onPress={() => void choose()}
        />
        <Text className="px-1 text-center text-sm text-muted">{hint}</Text>
        {message && (
          <Text className="px-1 text-center text-base text-danger" accessibilityLiveRegion="polite">
            {message}
          </Text>
        )}
      </View>
    </ImportShell>
  );
}

/** Numbered steps on one plate, each number in a soft disc. */
export function Steps({ steps }: { steps: string[] }) {
  const p = usePalette();
  return (
    <Plate className="gap-4 p-5">
      {steps.map((step, i) => (
        <View key={step} className="flex-row items-start gap-3">
          <View
            className="size-[26px] items-center justify-center rounded-full bg-plate-2"
            accessibilityElementsHidden
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: p.text, fontVariant: ["tabular-nums"] }}
            >
              {i + 1}
            </Text>
          </View>
          <Text className="flex-1 pt-0.5 text-base text-text-2">{step}</Text>
        </View>
      ))}
    </Plate>
  );
}
