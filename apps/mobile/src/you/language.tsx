import { useLingui } from "@lingui/react/macro";
import { api, type Settings } from "@lymi/client/api";
import { settingsQuery } from "@lymi/client/queries";
import type { AppLanguage } from "@lymi/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { View } from "react-native";
import { activate, deviceLanguage, i18n, isAppLanguage } from "../i18n";
import { Select } from "../ui/menu";
import { Text } from "../ui/primitives";
import { RowFace } from "../ui/row";

/** Each language in its own name, so a learner can find theirs whatever is active. */
const LANGUAGES: { value: AppLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "uk", label: "Українська" },
  { value: "ru", label: "Русский" },
];

/**
 * The account's app language, which meanings follow, so a change holds on the web too. The
 * interface switches on the tap and goes back if the server refuses. ADR 0013.
 */
export function useAppLanguage() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQuery);
  const mutation = useMutation({
    scope: { id: "app-language" },
    // Saved, never queued: offline it fails at once and goes back.
    networkMode: "always",
    mutationFn: (appLanguage: AppLanguage) => api.updateSettings({ appLanguage }),
    onMutate: async (appLanguage) => {
      await qc.cancelQueries({ queryKey: settingsQuery.queryKey });
      const previous = qc.getQueryData<Settings>(settingsQuery.queryKey);
      qc.setQueryData<Settings>(
        settingsQuery.queryKey,
        (s) => s && { ...s, appLanguage, meaningLanguage: appLanguage },
      );
      const shown = i18n.locale;
      activate(appLanguage);
      return { previous, shown };
    },
    onError: (_error, _language, context) => {
      if (context?.previous) qc.setQueryData(settingsQuery.queryKey, context.previous);
      activate(isAppLanguage(context?.shown) ? context.shown : deviceLanguage());
    },
    onSuccess: (value) => qc.setQueryData(settingsQuery.queryKey, value),
  });
  return {
    ready: settings.isSuccess,
    // Null means never chosen: the language the phone already shows.
    saved: settings.data?.appLanguage ?? null,
    change: mutation.mutate,
    failed: mutation.isError,
  };
}

type Language = ReturnType<typeof useAppLanguage>;

/** The row that picks it; dimmed until the account's choice has loaded. */
export function LanguageRow({ language }: { language: Language }) {
  const { t } = useLingui();
  const value = language.saved ?? (isAppLanguage(i18n.locale) ? i18n.locale : "en");
  return (
    <View
      className={language.ready ? undefined : "opacity-45"}
      pointerEvents={language.ready ? "auto" : "none"}
      accessibilityState={{ disabled: !language.ready }}
    >
      <Select
        label={t`Language`}
        value={value}
        options={LANGUAGES}
        onChange={language.change}
        trigger={
          <RowFace
            icon="language"
            label={t`Language`}
            value={LANGUAGES.find((o) => o.value === value)?.label}
          />
        }
      />
    </View>
  );
}

/** Under the group: what the language also changes, or why it did not change. */
export function LanguageNote({ language }: { language: Language }) {
  const { t } = useLingui();
  return language.failed ? (
    <Text className="px-4 text-base text-danger" accessibilityLiveRegion="polite">
      {t`Couldn’t save the language. Check your connection and try again.`}
    </Text>
  ) : (
    <Text className="px-4 text-sm text-ink-muted">
      {t`App language, and the language AI uses for meanings.`}
    </Text>
  );
}
